const fs = require('fs');
declare var Promise: any;

export class FlatDriver {

    public set(col: string, key: string, data: any){
        return new Promise((resolve, reject)=>{
            this._queueArray.push(()=>{
                this._write(col, key, data)
                    .then(()=>{
                        resolve();
                    })
                    .catch((e)=>{
                        console.log(e);
                        reject(e);
                    })
            });
            if(this._queueBusy){
                // Do Nothing
            } else {
                this._taskQueue();
            }
        });
    }

    public get(col?: string, select?: any){
        return new Promise((resolve, reject)=>{
            this._queueArray.push(()=>{
                if(col == undefined){
                    // Collection undefined, return all data
                    resolve(this._data);
                } else {
                    if(this._data[col]){
                        // Collection exists
                        if(select == undefined){
                            // Select is undefined. Return entire collection
                            resolve(this._data[col]);
                        } else {
                            // Select is defined. We're gonna do a move.
                            if(select['key']){
                                // If key is specified we will return the specific key
                                resolve(this._data[col][select.key]);
                            } else {
                                // No idea what they want
                                reject();
                                throw '¯\\_(ツ)_/¯';
                            }
                        }
                    }
                }
            });


            if(this._queueBusy){
                // Do Nothing
            } else {
                this._taskQueue();
            }
        });
    }

    public del(col: string, key: string){
        return new Promise((resolve, reject)=>{
            this._queueArray.push(()=>{
                if(col == undefined || key == undefined){
                    reject();
                    throw "FlatDriver Error: Delete requires both a collection and key to be supplied!";
                } else {
                    if(this._schemaEnabled){
                        // Schema is enabled
                        if(this._data[col]){
                            // Collection exists
                            if(this._data[col][key]){
                                // Key exists in collection
                                let id = this._data[col][key]._id;
                                delete this._idMap[id];
                                delete this._data[col][key];
                                this._fileWriterSchema();
                                resolve();
                            } else {
                                // Key does not exist in collection
                                reject();
                            }
                        } else {
                            // Collection does not exist
                            reject();
                            throw "FlatDriver Error: Collection " + col + " does not exist";
                        }
                    } else {
                        // Schema is not enabled
                        if(this._data[key]){
                            // Key exists
                            delete this._data[key];
                            this._fileWriter();
                            resolve()
                        } else {
                            // Key does not exist
                            reject();
                        }
                    }
                }
            });

            if(this._queueBusy){
                // Do Nothing
            } else {
                this._taskQueue();
            }
        });
    }

    // Collection Manipulation
    public addCollection(schema: any){
        return new Promise((resolve, reject)=>{
            this._queueArray.push(()=>{
                if(schema == undefined){
                    reject();
                    throw "FlatDriver Error: Schema must be defined when adding new collection!";
                } else if(!this._schemaEnabled){
                    reject();
                    throw "FlatDriver Error: Schema is not enabled on the current Data Set: " + this._dataPath;
                } else {
                    if(typeof schema === 'object' && !Array.isArray(schema)){
                        // Schema is an Object with Key Value pairs
                        let newCol = {
                            DATA: {},
                            SCHEMA: {}
                        };
                        Object.keys(schema).forEach((key)=>{
                            if(this._data[key]){
                                reject();
                                throw "FlatDriver Error: Collection already exists!";
                            } else {
                                newCol.DATA[key] = {};
                            }
                        });
                        newCol.SCHEMA = this._schemaParse(schema);
                        Object.keys(newCol.SCHEMA).forEach((key)=>{
                            if(this._schema[key]){
                                reject();
                                throw "FlatDriver Error: Schema entry already exists!";
                            } else {
                                this._schema[key] = newCol.SCHEMA[key];
                            }
                        });
                        this._fileWriterSchema();
                        resolve();
                    } else {
                        // Schema is not an Object
                        throw "FlatDrive Error: Schema must be a Key Value Object!";
                    }
                }
            });
            if(this._queueBusy){
                // Do Nothing
            } else {
                this._taskQueue();
            }
        });
    }



    // Task Queue Stuff
    private _queueArray = [];
    private _queueBusy: boolean = false;
    private _taskQueue(){
        this._queueBusy = true;
        while(this._queueArray.length){
            this._queueArray.shift().call();
        }
        this._queueBusy = false;
    }

    private _write(col, key, data){
        return new Promise((resolve, reject)=>{
            if(this._schemaEnabled){
                // Schema is enabled
                if(!col){
                    throw 'FlatDriver Error: Trying to write data without a collection to a Schema Enabled Data Set!';
                }
                if(this._data[col]){
                    // Collection exists
                    if(this._data[col][key]){
                        // Entry in collection exists
                        // Make sure we aren't overwriting existing data
                        Object.keys(data).forEach((dKey)=>{
                            this._data[col][key][dKey] = data[dKey];
                        });
                        this._fileWriterSchema();
                        resolve();
                    } else {
                        // Entry in collection does not exist
                        this._data[col][key] = {};
                        Object.keys(data).forEach((dKey)=>{
                            this._data[col][key][dKey] = data[dKey];
                        });
                        this._data[col][key]['_id'] = this._idGen();
                        this._fileWriterSchema();
                        resolve();
                    }
                } else {
                    // Collection does not exist
                    reject('FlatDriver Error: Collection does not exist!');
                }
            } else {
                // Schema is not enabled
                this._data[key] = data;
                this._fileWriter();
                resolve();
            }
        });
    }

    private _fileWriterSchema(){
        try {
            let toWrite = {
                DATA: this._data,
                SCHEMA: this._schema,
                IDMAP: this._idMap
            };
            let json = JSON.stringify(toWrite);
            fs.writeFileSync(this._dataPath, json, 'utf8');
            return;
        } catch(e){
            throw e;
        }
    }

    private _fileWriter(){
        try {
            let json = JSON.stringify(this._data);
            fs.writeFileSync(this._dataPath, json, 'utf8');
            return;
        } catch(e){
            throw e;
        }
    }

    private _read(){
        return new Promise((resolve, reject)=>{

        });
    }

    private _delete(){

    }

    // Static Crap and Stuff
    private static _flatDriverInstance: FlatDriver;
    private _data: any;
    private _schema: any;
    private _idMap: any;
    private _schemaEnabled: boolean = false;
    private _dataPath: string;

    constructor(
        dataPath: string
    ){
        this._dataPath = dataPath;
        return this;
    }


    public static attachSimple(dp: string){
        if(this._flatDriverInstance){
            return this._flatDriverInstance;
        } else {
            if(dp == undefined){
                throw "FlatDriver Attach requires a path to a file!";
            } else {
                this._flatDriverInstance = new FlatDriver(dp);
                this._flatDriverInstance._attachFile(dp, (parsed)=>{
                    this._flatDriverInstance._data = parsed;
                    return this._flatDriverInstance;
                }, (e)=>{
                    if(e == 'nofile'){
                        throw 'FlatDriver Error: ' + dp + ' does not exist!';
                    } else {
                        throw e;
                    }
                })
            }
        }
    }

    public static attach(dp?: string, schema?: any){
        return new Promise((resolve, reject)=>{
            if(!dp && !schema){
                if(this._flatDriverInstance){
                    resolve(this._flatDriverInstance);
                } else {
                    throw 'FlatDriver Error: No instance to connect to!';
                }
            } else if(this._flatDriverInstance){
                resolve(this._flatDriverInstance);
            } else if(typeof dp === 'string'){
                this._flatDriverInstance = new FlatDriver(dp);
                this._flatDriverInstance._attachFile(dp, (parsed)=>{
                    if(parsed['SCHEMA']){
                        this._flatDriverInstance._schemaEnabled = true;
                        this._flatDriverInstance._schema = parsed['SCHEMA'];
                        this._flatDriverInstance._data = parsed['DATA'];
                        this._flatDriverInstance._idMap = parsed['IDMAP'];
                    }
                    if(!this._flatDriverInstance._schemaEnabled){
                        this._flatDriverInstance._data = parsed;
                    }
                    resolve(this._flatDriverInstance);

                }, (e)=>{
                    if(e == 'nofile'){
                        if(schema != undefined){
                            this._flatDriverInstance._createFile(dp, schema, (wf)=>{
                                this._flatDriverInstance._schemaEnabled = true;
                                this._flatDriverInstance._data = wf['DATA'];
                                this._flatDriverInstance._schema = wf['SCHEMA'];
                                this._flatDriverInstance._idMap = wf['IDMAP'];
                                resolve(this._flatDriverInstance);
                            }, (err)=>{
                                throw err;
                            })
                        } else {
                            throw 'FlatDriver Error: ' + dp + ' does not exist! Additionally, there was no schema provided to create a file!';
                        }
                    } else {
                        throw e;
                    }
                })
            } else {
                throw "FlatDriver Attach requires a path to a file!";
            }
        });
    }

    public static attachSync(dp?: string, schema?: any){
        if(!dp && !schema){
            if(this._flatDriverInstance){
                return this._flatDriverInstance;
            } else {
                throw 'FlatDriver Error: No instance to connect to!';
            }
        } else if(this._flatDriverInstance){
            return this._flatDriverInstance;
        } else if(typeof dp === 'string'){
            this._flatDriverInstance = new FlatDriver(dp);
            let tData = this._flatDriverInstance._attachFileSync(dp);
            if(tData == null){
                if(schema != undefined){
                    let wf = this._flatDriverInstance._createFileSync(dp, schema);
                    if(wf){
                        this._flatDriverInstance._schemaEnabled = true;
                        this._flatDriverInstance._data = wf['DATA'];
                        this._flatDriverInstance._schema = wf['SCHEMA'];
                        this._flatDriverInstance._idMap = wf['IDMAP'];
                        return this._flatDriverInstance;
                    } else {
                        throw 'FlatDriver Error: Something went wrong!';
                    }
                } else {
                    throw 'FlatDriver Error: ' + dp + ' does not exist! Additionally, there was no schema provided to create a file!';
                }
            } else {
                if(tData['SCHEMA']){
                    this._flatDriverInstance._schemaEnabled = true;
                    this._flatDriverInstance._schema = tData['SCHEMA'];
                    this._flatDriverInstance._data = tData['DATA'];
                    this._flatDriverInstance._idMap = tData['IDMAP'];
                }

                if(!this._flatDriverInstance._schemaEnabled){
                    this._flatDriverInstance._data = tData;
                }
                return this._flatDriverInstance;
            }
        } else {
            throw "FlatDriver Attach requires a path to a file!";
        }
    }



    // INTERNAL METHODS
    private _attachFile(tar, cb, error){
        if(fs.existsSync(tar)){
            fs.readFile(tar, 'utf8', (err, data)=>{
                if(err){
                    error(err);
                } else {
                    try {
                        let pData = JSON.parse(data);
                        cb(pData);
                    } catch(e){
                        error(e);
                    }
                }
            })
        } else {
            error('nofile');
        }
    }

    private _attachFileSync(tar){
        if(fs.existsSync(tar)){
            try {
                let tData = fs.readFileSync(tar, 'utf8');
                let pData = JSON.parse(tData);
                return pData;
            } catch(e){
                return null;
            }
        } else {
            console.log('File does not exist');
            return null;
        }
    }

    private _createFile(tar, schema, cb, error){
        let newFlat = {
            DATA: {},
            SCHEMA: {},
            IDMAP: {}
        };

        Object.keys(schema).forEach((key)=>{
            newFlat.DATA[key] = {};
        });

        newFlat.SCHEMA = this._schemaParse(schema);

        try {
            let json = JSON.stringify(newFlat);
            fs.writeFile(tar, json, 'utf8', (err)=>{
                if(err){
                    error(err);
                } else {
                    cb(newFlat);
                }
            })
        } catch(e){
            error(e);
        }
    }

    private _createFileSync(tar, schema){
        let newFlat = {
            DATA: {},
            SCHEMA: {},
            IDMAP: {}
        };

        Object.keys(schema).forEach((key)=>{
            newFlat.DATA[key] = {};
        });

        newFlat.SCHEMA = this._schemaParse(schema);

        try {
            let json = JSON.stringify(newFlat);
            fs.writeFileSync(tar, json, 'utf8');
            return newFlat;
        } catch(e){
            throw e;
        }
    }

    private _schemaParse(seg: any){
        console.log('PARSING: ', seg);
        if(typeof seg === 'object'){
            // Is an Object or an Array
            if(!Array.isArray(seg)){
                // Is not an array
                return this._schemaParseObj(seg);
            } else {
                // Is an array
                throw 'FlatDriver Error: Schema is an Array. Must be a Key Value Object!';
            }
        } else {
            throw 'FlatDrive Error: Schema must be a Key Value Object!';
        }
    }

    private _schemaParseObj(seg){
        let root = {};
        Object.keys(seg).forEach((key)=>{
            if(typeof seg[key] === 'object'){
                if(!Array.isArray(seg[key])){
                    root[key] = this._schemaParseObj(seg[key]);
                } else {
                    root[key] = 'array';
                }
            } else {
                root[key] = typeof seg[key];
            }
        });
        return root;
    }

    // Unique ID Generator
    private _sym: string = 'abcdefghijklmnopqrstuvwxyz1234567890';
    private _symLen = this._sym.length;

    private _idGen(){
        let tempId = '';
        for(let i=0;i<this._symLen;i++){
            tempId += this._sym[Math.floor(Math.random() * (this._symLen))];
        }
        if(this._idMap[tempId]){
            this._idGen();
        } else {
            this._idMap[tempId] = tempId;
            return tempId;
        }
    }

}
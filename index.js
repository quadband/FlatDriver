"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const fs = require('fs');
class FlatDriver {
    constructor(dataPath) {
        this._queueArray = [];
        this._queueBusy = false;
        this._schemaEnabled = false;
        this._sym = 'abcdefghijklmnopqrstuvwxyz1234567890';
        this._symLen = this._sym.length;
        this._dataPath = dataPath;
        return this;
    }
    set(col, key, data) {
        return new Promise((resolve, reject) => {
            this._queueArray.push(() => {
                this._write(col, key, data)
                    .then(() => {
                    resolve();
                })
                    .catch((e) => {
                    console.log(e);
                    reject(e);
                });
            });
            if (this._queueBusy) {
            }
            else {
                this._taskQueue();
            }
        });
    }
    get(col, select) {
        return new Promise((resolve, reject) => {
            this._queueArray.push(() => {
                if (col == undefined) {
                    resolve(this._data);
                }
                else {
                    if (this._data[col]) {
                        if (select == undefined) {
                            resolve(this._data[col]);
                        }
                        else {
                            if (select['key']) {
                                resolve(this._data[col][select.key]);
                            }
                            else {
                                reject();
                                throw '¯\\_(ツ)_/¯';
                            }
                        }
                    }
                }
            });
            if (this._queueBusy) {
            }
            else {
                this._taskQueue();
            }
        });
    }
    del(col, key) {
        return new Promise((resolve, reject) => {
            this._queueArray.push(() => {
                if (col == undefined || key == undefined) {
                    reject();
                    throw "FlatDriver Error: Delete requires both a collection and key to be supplied!";
                }
                else {
                    if (this._schemaEnabled) {
                        if (this._data[col]) {
                            if (this._data[col][key]) {
                                let id = this._data[col][key]._id;
                                delete this._idMap[id];
                                delete this._data[col][key];
                                this._fileWriterSchema();
                                resolve();
                            }
                            else {
                                reject();
                            }
                        }
                        else {
                            reject();
                            throw "FlatDriver Error: Collection " + col + " does not exist";
                        }
                    }
                    else {
                        if (this._data[key]) {
                            delete this._data[key];
                            this._fileWriter();
                            resolve();
                        }
                        else {
                            reject();
                        }
                    }
                }
            });
            if (this._queueBusy) {
            }
            else {
                this._taskQueue();
            }
        });
    }
    addCollection(schema) {
        return new Promise((resolve, reject) => {
            this._queueArray.push(() => {
                if (schema == undefined) {
                    reject();
                    throw "FlatDriver Error: Schema must be defined when adding new collection!";
                }
                else if (!this._schemaEnabled) {
                    reject();
                    throw "FlatDriver Error: Schema is not enabled on the current Data Set: " + this._dataPath;
                }
                else {
                    if (typeof schema === 'object' && !Array.isArray(schema)) {
                        let newCol = {
                            DATA: {},
                            SCHEMA: {}
                        };
                        Object.keys(schema).forEach((key) => {
                            if (this._data[key]) {
                                reject();
                                throw "FlatDriver Error: Collection already exists!";
                            }
                            else {
                                newCol.DATA[key] = {};
                            }
                        });
                        newCol.SCHEMA = this._schemaParse(schema);
                        Object.keys(newCol.SCHEMA).forEach((key) => {
                            if (this._schema[key]) {
                                reject();
                                throw "FlatDriver Error: Schema entry already exists!";
                            }
                            else {
                                this._schema[key] = newCol.SCHEMA[key];
                            }
                        });
                        this._fileWriterSchema();
                        resolve();
                    }
                    else {
                        throw "FlatDrive Error: Schema must be a Key Value Object!";
                    }
                }
            });
            if (this._queueBusy) {
            }
            else {
                this._taskQueue();
            }
        });
    }
    _taskQueue() {
        this._queueBusy = true;
        while (this._queueArray.length) {
            this._queueArray.shift().call();
        }
        this._queueBusy = false;
    }
    _write(col, key, data) {
        return new Promise((resolve, reject) => {
            if (this._schemaEnabled) {
                if (!col) {
                    throw 'FlatDriver Error: Trying to write data without a collection to a Schema Enabled Data Set!';
                }
                if (this._data[col]) {
                    if (this._data[col][key]) {
                        Object.keys(data).forEach((dKey) => {
                            this._data[col][key][dKey] = data[dKey];
                        });
                        this._fileWriterSchema();
                        resolve();
                    }
                    else {
                        this._data[col][key] = {};
                        Object.keys(data).forEach((dKey) => {
                            this._data[col][key][dKey] = data[dKey];
                        });
                        this._data[col][key]['_id'] = this._idGen();
                        this._fileWriterSchema();
                        resolve();
                    }
                }
                else {
                    reject('FlatDriver Error: Collection does not exist!');
                }
            }
            else {
                this._data[key] = data;
                this._fileWriter();
                resolve();
            }
        });
    }
    _fileWriterSchema() {
        try {
            let toWrite = {
                DATA: this._data,
                SCHEMA: this._schema,
                IDMAP: this._idMap
            };
            let json = JSON.stringify(toWrite);
            fs.writeFileSync(this._dataPath, json, 'utf8');
            return;
        }
        catch (e) {
            throw e;
        }
    }
    _fileWriter() {
        try {
            let json = JSON.stringify(this._data);
            fs.writeFileSync(this._dataPath, json, 'utf8');
            return;
        }
        catch (e) {
            throw e;
        }
    }
    _read() {
        return new Promise((resolve, reject) => {
        });
    }
    _delete() {
    }
    static attachSimple(dp) {
        if (this._flatDriverInstance) {
            return this._flatDriverInstance;
        }
        else {
            if (dp == undefined) {
                throw "FlatDriver Attach requires a path to a file!";
            }
            else {
                this._flatDriverInstance = new FlatDriver(dp);
                this._flatDriverInstance._attachFile(dp, (parsed) => {
                    this._flatDriverInstance._data = parsed;
                    return this._flatDriverInstance;
                }, (e) => {
                    if (e == 'nofile') {
                        throw 'FlatDriver Error: ' + dp + ' does not exist!';
                    }
                    else {
                        throw e;
                    }
                });
            }
        }
    }
    static attach(dp, schema) {
        return new Promise((resolve, reject) => {
            if (!dp && !schema) {
                if (this._flatDriverInstance) {
                    resolve(this._flatDriverInstance);
                }
                else {
                    throw 'FlatDriver Error: No instance to connect to!';
                }
            }
            else if (this._flatDriverInstance) {
                resolve(this._flatDriverInstance);
            }
            else if (typeof dp === 'string') {
                this._flatDriverInstance = new FlatDriver(dp);
                this._flatDriverInstance._attachFile(dp, (parsed) => {
                    if (parsed['SCHEMA']) {
                        this._flatDriverInstance._schemaEnabled = true;
                        this._flatDriverInstance._schema = parsed['SCHEMA'];
                        this._flatDriverInstance._data = parsed['DATA'];
                        this._flatDriverInstance._idMap = parsed['IDMAP'];
                    }
                    if (!this._flatDriverInstance._schemaEnabled) {
                        this._flatDriverInstance._data = parsed;
                    }
                    resolve(this._flatDriverInstance);
                }, (e) => {
                    if (e == 'nofile') {
                        if (schema != undefined) {
                            this._flatDriverInstance._createFile(dp, schema, (wf) => {
                                this._flatDriverInstance._schemaEnabled = true;
                                this._flatDriverInstance._data = wf['DATA'];
                                this._flatDriverInstance._schema = wf['SCHEMA'];
                                this._flatDriverInstance._idMap = wf['IDMAP'];
                                resolve(this._flatDriverInstance);
                            }, (err) => {
                                throw err;
                            });
                        }
                        else {
                            throw 'FlatDriver Error: ' + dp + ' does not exist! Additionally, there was no schema provided to create a file!';
                        }
                    }
                    else {
                        throw e;
                    }
                });
            }
            else {
                throw "FlatDriver Attach requires a path to a file!";
            }
        });
    }
    static attachSync(dp, schema) {
        if (!dp && !schema) {
            if (this._flatDriverInstance) {
                return this._flatDriverInstance;
            }
            else {
                throw 'FlatDriver Error: No instance to connect to!';
            }
        }
        else if (this._flatDriverInstance) {
            return this._flatDriverInstance;
        }
        else if (typeof dp === 'string') {
            this._flatDriverInstance = new FlatDriver(dp);
            let tData = this._flatDriverInstance._attachFileSync(dp);
            if (tData == null) {
                if (schema != undefined) {
                    let wf = this._flatDriverInstance._createFileSync(dp, schema);
                    if (wf) {
                        this._flatDriverInstance._schemaEnabled = true;
                        this._flatDriverInstance._data = wf['DATA'];
                        this._flatDriverInstance._schema = wf['SCHEMA'];
                        this._flatDriverInstance._idMap = wf['IDMAP'];
                        return this._flatDriverInstance;
                    }
                    else {
                        throw 'FlatDriver Error: Something went wrong!';
                    }
                }
                else {
                    throw 'FlatDriver Error: ' + dp + ' does not exist! Additionally, there was no schema provided to create a file!';
                }
            }
            else {
                if (tData['SCHEMA']) {
                    this._flatDriverInstance._schemaEnabled = true;
                    this._flatDriverInstance._schema = tData['SCHEMA'];
                    this._flatDriverInstance._data = tData['DATA'];
                    this._flatDriverInstance._idMap = tData['IDMAP'];
                }
                if (!this._flatDriverInstance._schemaEnabled) {
                    this._flatDriverInstance._data = tData;
                }
                return this._flatDriverInstance;
            }
        }
        else {
            throw "FlatDriver Attach requires a path to a file!";
        }
    }
    _attachFile(tar, cb, error) {
        if (fs.existsSync(tar)) {
            fs.readFile(tar, 'utf8', (err, data) => {
                if (err) {
                    error(err);
                }
                else {
                    try {
                        let pData = JSON.parse(data);
                        cb(pData);
                    }
                    catch (e) {
                        error(e);
                    }
                }
            });
        }
        else {
            error('nofile');
        }
    }
    _attachFileSync(tar) {
        if (fs.existsSync(tar)) {
            try {
                let tData = fs.readFileSync(tar, 'utf8');
                let pData = JSON.parse(tData);
                return pData;
            }
            catch (e) {
                return null;
            }
        }
        else {
            console.log('File does not exist');
            return null;
        }
    }
    _createFile(tar, schema, cb, error) {
        let newFlat = {
            DATA: {},
            SCHEMA: {},
            IDMAP: {}
        };
        Object.keys(schema).forEach((key) => {
            newFlat.DATA[key] = {};
        });
        newFlat.SCHEMA = this._schemaParse(schema);
        try {
            let json = JSON.stringify(newFlat);
            fs.writeFile(tar, json, 'utf8', (err) => {
                if (err) {
                    error(err);
                }
                else {
                    cb(newFlat);
                }
            });
        }
        catch (e) {
            error(e);
        }
    }
    _createFileSync(tar, schema) {
        let newFlat = {
            DATA: {},
            SCHEMA: {},
            IDMAP: {}
        };
        Object.keys(schema).forEach((key) => {
            newFlat.DATA[key] = {};
        });
        newFlat.SCHEMA = this._schemaParse(schema);
        try {
            let json = JSON.stringify(newFlat);
            fs.writeFileSync(tar, json, 'utf8');
            return newFlat;
        }
        catch (e) {
            throw e;
        }
    }
    _schemaParse(seg) {
        console.log('PARSING: ', seg);
        if (typeof seg === 'object') {
            if (!Array.isArray(seg)) {
                return this._schemaParseObj(seg);
            }
            else {
                throw 'FlatDriver Error: Schema is an Array. Must be a Key Value Object!';
            }
        }
        else {
            throw 'FlatDrive Error: Schema must be a Key Value Object!';
        }
    }
    _schemaParseObj(seg) {
        let root = {};
        Object.keys(seg).forEach((key) => {
            if (typeof seg[key] === 'object') {
                if (!Array.isArray(seg[key])) {
                    root[key] = this._schemaParseObj(seg[key]);
                }
                else {
                    root[key] = 'array';
                }
            }
            else {
                root[key] = typeof seg[key];
            }
        });
        return root;
    }
    _idGen() {
        let tempId = '';
        for (let i = 0; i < this._symLen; i++) {
            tempId += this._sym[Math.floor(Math.random() * (this._symLen))];
        }
        if (this._idMap[tempId]) {
            this._idGen();
        }
        else {
            this._idMap[tempId] = tempId;
            return tempId;
        }
    }
}
exports.FlatDriver = FlatDriver;
//# sourceMappingURL=index.js.map
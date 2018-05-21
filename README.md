# FlatDriver - A Lazy Man's Database
JSON Database with support for schema's.

## Easy to install:
```
npm install --save-dev flatdriver
```

## Easy to import into your project:
```javascript
import { FlatDriver } from 'flatdriver';
```

## Already have a JSON file somewhere?
```javascript
let flatDriver;
FlatDriver.attach('./myFile.json')
	.then((fd)=>{
		flatDriver = fd;
		flatDriver.get()
			.then((data)=>{
				console.log('Data: ', data);
			})
	})
```

## How about synchronously?
```javascript
let flatDriver = FlatDriver.attachSync('./myFile.json');
flatDriver.get()
	.then((data)=>{
		console.log('Data: ', data);
	})
```

## Generate a schema with a blueprint:
If a JSON file does not exist, when supplied with a schema FlatDriver will generate one.
```javascript
private flatDriver: FlatDriver;
private initFlatDriver(){
	let path = './database.json';
	let schema = {
    	Users: {
    		User: {
				userName: '',
    			roles: [],
    			skyApps: []
    		}
    	},
    	SkyApps: {
    		SkyApp: {
    			name: '',
    			path: '',
    			roles: []
    		}
    	}
    };

    this.flatDriver = FlatDriver.attachSync(path, schema);
    this.flatDriver.set('Users', 'dave@siibeon.com', {
    	userName: 'dave@siibeon.com',
    	roles: ['admin']
    })
    .then(()=>{
    	console.log('We did it, boys.');
    })
}
```

## The particulars:
### Install:
```
npm install --save-dev flatdriver
```

### Import:
``` javascript
import { FlatDriver } from 'flatdriver';
```

### Initialize Asynchronously:
```javascript
FlatDriver.attach(filePath, schema)
	.then((fdInstance)=>{
  		// Returns in a promise
	});
```

### Initialize Synchronously:
```javascript
let flatDriver = flatDriver.attachSync(filePath, schema);
flatDriver.get()
	.then((data)=>{
  		// Gets all the data
	});
```

### Store Data:
```javascript
flatDriver.set(collection, key, data)
	.then(()=>{
  		// Returns a promise
	});
```

### Get Data:
Select and collection are optional. 
Select currently only takes `key`

If you use `get` without any arguments it will return the entire data set.

More things coming soon.
```javascript
let select = {key: 'david@siibeon.com'};
flatDriver.get(collection, select)
	.then((data)=>{
  		// Returns a promise
	});
```

### Delete an entry:
```javascript
flatDriver.del(collection, key)
	.then(()=>{
  		// Returns a promise when finished
	});
```

### Add a collection and schema on the fly:
```javascript
let newSchema = {
  NewCollection: {
    New: {
      another: [],
      thing: ''
    }
  }
};
flatDriver.addCollection(newSchema)
	.then(()=>{
  		// Returns a promise when finished
	});
```


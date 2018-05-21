# FlatDriver - A Lazy Man's Database
JSON Database with support for schema's.

## Easy to install:
```
npm install --save-dev flatdriver
```

## Easy to import into your project:
``` javascript
import { FlatDriver } from 'flatdriver';
```

## Already have a JSON file somewhere?
``` javascript
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
``` javascript
let flatDriver = FlatDriver.attachSync('./myFile.json');
flatDriver.get()
	.then((data)=>{
		console.log('Data: ', data);
	})
```

## Generate a schema with a blueprint:
``` javascript

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


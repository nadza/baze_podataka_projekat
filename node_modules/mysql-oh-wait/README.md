# Mysql Oh Wait! (Mysql await)

![code coverage](https://img.shields.io/codecov/c/github/gbili/mysql-oh-wait.svg)
![version](https://img.shields.io/npm/v/mysql-oh-wait.svg)
![downloads](https://img.shields.io/npm/dm/mysql-oh-wait.svg)
![license](https://img.shields.io/npm/l/mysql-oh-wait.svg)

Uses the great node `mysqljs/mysql` package and wraps around it to facilitate getting results as a return from `MysqlReq.query()`. Instead of needing to use callbacks, this package uses `Promises` and the `async / await` syntax which is much easier.
On top of that the advantage (if you need this feature of course) is that you don't need to worry about `connections` not being closed or open at the moment of querying.

## Installation

To install this `npm` package do

```sh
npm i mysql-oh-wait
```

## Usage

### MysqlReq

Then from your javascript files import either `MysqlReq` or `MysqlDump` with

```js
//var MysqlReq = require('mysql-oh-wait').MysqlReq;
import { MysqlReq } from 'mysql-oh-wait';
```

Then you can directly query your database:

```js
//import 'dotenv/config'; // this will get connection settings from .env file

import { MysqlReq, MysqlDump } from 'mysql-oh-wait';

const res = await MysqlReq.query({sql: 'SELECT * FROM MyTable WHERE ?', values: {myCol: 'myValue'}});
console.log(res); // [ { myCol: 'myValue', ...otherColumns }, { myCol: 'myValue', ...otherColumns2 }, ...otherRows ]
```

This is assuming you have set the connection details in environment variables like:

```env
process.env.DB_HOST = 'myhost'
process.env.DB_USER = 'myuser'
process.env.DB_PASSWORD = 'mypwd'
process.env.DB_NAME = 'mydbname'
process.env.MULTIPLE_STATEMENTS = 1
```

Or you can store these in a `.env` file. In which case the `import 'dotenv/config';` statement will load them for you. (You need to `npm i -P dotenv` for this to work.

### MysqlDump

If you want to create the database tables from an sql file you can use `MysqlDump`

```js
//var MysqlDump = require('mysql-oh-wait').MysqlDump;
import { MysqlDump } from 'mysql-oh-wait';
```

Then if you have an MysqlDump file somewhere you can simply do:

```js
import { MysqlDump } from 'mysql-oh-wait';
await MysqlDump.executeSqlFile(`${__dirname}/mysqldump.sql`);
```

This should have loaded all your tables in the database. Again, assuming you have database connection config in `process.env.DB_...` properties.

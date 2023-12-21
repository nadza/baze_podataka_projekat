import { Connection } from "mysql";

type Escape = Connection["escape"];

type ObjOf<T> = { [k: string]: T; }
type Stringable = string | boolean | number | Date | null;
type StringableObject = ObjOf<Stringable> | ObjOf<Stringable[]> | ObjOf<Stringable[][]>
type StringableMixedObject = ObjOf<Stringable | Stringable[] | Stringable[][]>
type StringableObj = ObjOf<Stringable>
type StringableArrayObj = ObjOf<Stringable[]>
type StringableArrayArrayObj = ObjOf<Stringable[][]>
export type Values = StringableMixedObject | StringableObject | Stringable[] | Stringable[][];

function isStringable(val: any): val is Stringable {
  return typeof val !== 'undefined'
    && (
      typeof val === 'string'
      || typeof val === 'number'
      || typeof val === 'boolean'
      || val instanceof Date
      || val === null
    );
}
function isStringableArray(val: any): val is Stringable[] {
  return val instanceof Array && (val.length > 0 && elementsAreOfType<Stringable>(val, isStringable));
}
function isStringableArrayArray(val: any): val is Stringable[][] {
  return val instanceof Array && (val.length > 0 && elementsAreOfType<Stringable[]>(val, isStringableArray));
}
function isStringableObj(val: any): val is StringableObj {
    return isObjectAndAllValuesAreOfType<Stringable>(val, isStringable);
}
function isStringableArrayObj(val: any): val is StringableArrayObj {
    return isObjectAndAllValuesAreOfType<Stringable[]>(val, isStringableArray);
}
function isStringableArrayArrayObj(val: any): val is StringableArrayArrayObj {
    return isObjectAndAllValuesAreOfType<Stringable[][]>(val, isStringableArrayArray);
}
function isStringableMixedObj(val: any): val is StringableMixedObject {
  return isPropObject(val)
    && isObjectAndAllValuesAreOfType<Stringable | Stringable[] | Stringable[][]>(val, x => isStringable(x) || isStringableArray(x) || isStringableArrayArray(x));
}
function isPropObject(val: any): val is { [k: string]: any; } {
  return typeof val === "object" && !(val instanceof Array);
}
function isObjectAndAllValuesAreOfType<T>(val: any, typecheck: (x: any) => boolean): val is ObjOf<T> {
  return isPropObject(val)
    && elementsAreOfType<T>(Object.values(val), typecheck);
}
function elementsAreOfType<T>(els: any[], typeCheck: (x: any) => boolean): els is T[] {
  return els.filter(typeCheck).length === els.length
}

export default class QueryFormat {

  public escape: Escape;
  public matchesCount: number | null = null;
  public values: Values | null = null;
  public copyOfValuesWhenArray: Stringable[] | Stringable[][] | null = null;

  constructor(connection: Connection) {
    this.escape = connection.escape.bind(connection);
    this.replacer = this.replacer.bind(this);
  }

  mapEscape(val: Stringable, depth: number, ref?: string): string
  mapEscape(val: Stringable[], depth: number, ref?: string): string[]
  mapEscape(val: Stringable[][], depth: number, ref?: string): string[][]
  mapEscape(val: Stringable | Stringable[] | Stringable[][], depth: number, ref?: string): string | string[] | string[][] {
    if (val instanceof Date) {
      val = QueryFormat.toMysqlDatetime(val);
    }

    if (typeof val === 'boolean') {
      val = val ? 1 : 0;
    } else if (val === null) {
       return 'NULL';
    }

    if (isStringable(val)) {
      return this.escape(val);
    }

    if (!(val instanceof Array)) {
      throw new Error(`Unsupported custom placeholder value for ref : ${ref}, type of value: ${typeof val}`);
    }

    if (val.length <= 0) {
      throw new Error('Cannot pass empty arrays as values');
    }

    if (depth > 2) {
      throw new Error('Supplied value has too many depth levels, max supported is 2 for INSERT VALUES :ref or 1 for IN (:ref)');
    }

    if (isStringableArray(val)) {
      return val.map((el: Stringable) => this.mapEscape(el, depth + 1));
    } else if (isStringableArrayArray(val)) {
      return val.map((el: Stringable[]) => this.mapEscape(el, depth + 1));
    } else {
      return val;
    }
  }

  static toMysqlDatetime(d: Date): string {
    return d.toISOString().slice(0,19).replace('T', ' ');
  }


  joinUseParenthesis(escapedValues: string): string
  joinUseParenthesis(escapedValues: string[]): string
  joinUseParenthesis(escapedValues: string[][]): string
  joinUseParenthesis(escapedValues: string | string[] | string[][]): string {
    if (typeof escapedValues === 'string') {
      return escapedValues;
    }

    if (escapedValues.length <= 0) {
      throw new Error('Empty arrays are not allowed as value');
    }

    const glueWithColonsSurroundWithParenthesis = (el: string[]) => `(${el.join(', ')})`;

    if (isStringableArrayArray(escapedValues)) {
      escapedValues = escapedValues.map(glueWithColonsSurroundWithParenthesis)
      return escapedValues.join(', ')
    } else {
      if (escapedValues[0][0] === '(') {
        return escapedValues.join(', ')
      }
      return glueWithColonsSurroundWithParenthesis(escapedValues);
    }
  }

  queryFormat(query: string, values?: Values): string {

    if (!query) throw new Error('A query must be provided');
    if (!values) return query;

    this.values = values;

    if (this.values instanceof Array) {
      this.copyOfValuesWhenArray = Object.assign([], values);
    }

    const regex = /\:([A-Za-z0-9_?]+)/g;

    const matches = query.match(regex);

    if (matches === null) {
      throw new Error('Your query does not contain any placeholder');
    }

    this.matchesCount = matches.length;

    return query.replace(regex, this.replacer);
  }

  replacer(ref: string, key: string): string {
    if (this.values === null) throw new Error('Need to pass the values in first');
    let ret;
    // question mark
    if (key === '?') {
      // single :?
        // a) stringable array array
        // b) object stringable
      // many :?, :?
        // c) stringable array
        // d) stringable array array
      if (isStringableObj(this.values)) {
        // b) object stringable
        return Object.keys(this.values).map((k: string) => {
          const val = (this.values as StringableObj)[k]
          return val === null
            ? `${k} IS NULL`
            : `${k} = ${this.escape(val)}`
          return ;
        }).join(' AND ');
      } else if (!this.copyOfValuesWhenArray) {
        throw new Error('the :? placeholder requires values to be an array');
      }
      // is stringable array (why not put ourselves in else of isStringableObject above?)
      if (this.matchesCount === 1) {
        if (isStringableArrayArray(this.copyOfValuesWhenArray)) {
          // a) stringable array array
          ret = this.mapEscape(this.copyOfValuesWhenArray, 0, ref); // string[][]
        } else {
          // -> unknown case)
          ret = this.mapEscape(this.copyOfValuesWhenArray, 0, ref); // string[]
        }
      } else { // matchesCount =0 or >=2
        // c) stringable array
        // d) stringable array array
        if (this.copyOfValuesWhenArray === null) throw new Error('This should have been set before');
        const replaceWithNext = this.copyOfValuesWhenArray.shift();
        if (replaceWithNext === undefined) {
          throw new Error('More question marks than elements');
        } else if (isStringableArray(replaceWithNext))  {
          ret = this.mapEscape(replaceWithNext, 0, ref); // stringable[]
        } else if (isStringable(replaceWithNext)) {
          ret = this.mapEscape(replaceWithNext, 0, ref); // stringable
        }
      }
      // single :ref
        // e) object stringable array
        // f) object stringable array array
      // many :ref, :ref
        // g) object stringable
        // h) object stringable array
    } else if (this.values.hasOwnProperty(key)) {// Not question mark aka -> named palceholders
      if (isStringableObj(this.values)) {
        // g) object stringable
        ret = this.mapEscape(this.values[key], 0, ref); // stringable
      } else if (isStringableArrayObj(this.values) && this.values.hasOwnProperty(key)) {
          // e) object stringable array
          // h) object stringable array
        ret = this.mapEscape(this.values[key], 0, ref); // stringable[]
      } else if (isStringableArrayArrayObj(this.values) && this.values.hasOwnProperty(key)) {
          // f) object stringable array array
        ret = this.mapEscape(this.values[key], 0, ref); // stringable[]
      } else if (isStringableMixedObj(this.values)) {
          // i) values is a mix of different types
        ret = this.mapEscape((this.values as any)[key], 0, ref); // stringable[]
      }
    } else {// named ref not present in values (dont replace anything)
      throw new Error(
        `Provided named ref: '${ref}' without corresponding value, keys are: ${Object.keys(this.values).join(', ')}
        values: ${Object.values(this.values).join(', ')}
        hasOwnProperty : ${(this.values.hasOwnProperty(key) ? 'yes': 'no')}
        Note: It may be a Promise, make sure all values are Stringable type and not some Promise lying around`
      );
    }

    // for ts overload recognition
    if (typeof ret === 'string') {
      return this.joinUseParenthesis(ret);
    } else if (isStringableArray(ret)) {
      return this.joinUseParenthesis(ret);
    } else if (isStringableArrayArray(ret)) {
      return this.joinUseParenthesis(ret);
    } else {
      console.log('========== ERRAH ============');
      console.log('An error is going to be raised, probably because you passed an object with more props than used');
      console.log('REF   : : : ', ref);
      console.log('KEY   : : : ', key);
      console.log('VALUES: : : ', this.values);
      console.log('RETRET: : : ', ret);
      throw new Error(
        `Ret: ${ret} is somehow undefined, not all cases have been handled, you are trying an unsupported usecase
        Provided named ref: '${ref}' without corresponding value, keys are: ${Object.keys(this.values).join(', ')}
        values: ${Object.values(this.values).join(', ')}
        hasOwnProperty : ${(this.values.hasOwnProperty(key) ? 'yes': 'no')}
        Note: It may be a Promise, make sure all values are Stringable type and not some Promise lying around`
      );
    }
  }
}

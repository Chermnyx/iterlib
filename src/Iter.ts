function getIteratotr<T>(iter: Iterable<T>) {
  return iter[Symbol.iterator]();
}

type MapCallback<T, U> = (currentValue: T, index: number) => U;

export default class Iter<T> implements Iterable<T> {
  [Symbol.iterator]: () => Iterator<T>;

  constructor(iter: Iterable<T>) {
    this[Symbol.iterator] = iter[Symbol.iterator].bind(iter);
  }

  toArray(): T[] {
    return [...this];
  }

  /**
   * Iterates this object. Useful when combining it with `.map()`
   */
  exec(): void {
    for (const _ of this) {
    }
  }

  /**
   * Equivalent to `Promise.all(this.toArray)`
   */
  promisify(): Promise<T[]> {
    return Promise.all(this.toArray());
  }

  /**
   * @returns `true` if all elements of the iterable are true (or if the iterable is empty)
   */
  all(): boolean {
    for (const i of this) if (!i) return false;
    return true;
  }

  /**
   * @returns `true` if any element of the iterable is true.
   * If the iterable is empty, return `false`
   */
  any(): boolean {
    for (const i of this) if (i) return true;
    return false;
  }

  /**
   * Combines iterators:
   * `cocant([1, 1], [2, 2]) == [1, 1, 2, 2]`
   */
  concat<U>(...iters: Iterable<U>[]): Iter<T | U> {
    return new Iter(
      function*(this: Iter<T>) {
        yield* this;
        for (const iter of iters) yield* iter;
      }.call(this)
    );
  }

  private _zip<U>(
    longest: boolean,
    iterables: Iterable<U>[]
  ): Iter<(T | U)[]> {
    return new Iter(
      // based on https://github.com/fitzgen/wu.js/blob/master/wu.js
      function*(this: Iter<T>) {
        const iters = [this, ...iterables].map(getIteratotr);

        for (;;) {
          let numFinished = 0;
          const zipped = [];

          for (const iter of iters) {
            const { value, done } = iter.next();

            if (done) {
              if (!longest) {
                return;
              }

              if (++numFinished === iters.length) {
                return;
              }
            }

            zipped.push(value);
          }

          yield zipped;
        }
      }.call(this)
    );
  }

  zip<U>(...iters: Iterable<U>[]) {
    return this._zip<U>(false, iters);
  }

  zipLongest<U>(...iters: Iterable<U>[]) {
    return this._zip<U | undefined>(true, iters);
  }

  /**
   * @returns a new Iter object that contains the key/value pairs for each index in the Iter
   */
  entries(): Iter<[number, T]> {
    return new Iter(
      function*(this: Iter<T>) {
        let i = 0;
        for (const item of this) yield [i++, item];
      }.call(this)
    );
  }

  /**
   * The map() method creates a new Iter with the results of calling a provided function on every element in the calling Iter
   * @returns A new Iter with each element being the result of the callback function
   */
  map<U>(callback: MapCallback<T, U>): Iter<U> {
    return new Iter(
      function*(this: Iter<T>) {
        for (const [i, val] of this.entries()) yield callback(val, i);
      }.call(this)
    );
  }

  /**
   * Tests whether all elements in the Iter pass the test implemented by the provided function
   * @returns `true` if the callback function returns a truthy value for every Iter element; otherwise, `false`
   */
  every(callback: MapCallback<T, boolean>): boolean {
    return this.map(callback).all();
  }

  /**
   * Tests whether at least one element in the Iter passes the test implemented by the provided function
   * @returns `true` if the callback function returns a truthy value for any Iter element; otherwise, `false`
   */
  some(callback: MapCallback<T, boolean>): boolean {
    return this.map(callback).any();
  }

  /**
   * @returns a portion of an Iter into a new Iter object selected from `begin` to `end` (`end` not included)
   */
  slice(begin: number, end?: number): Iter<T> {
    return new Iter(
      function*(this: Iter<T>) {
        for (const [i, item] of this.entries()) {
          if (i < begin) continue;
          if (end !== undefined && i >= end) break;
          yield item;
        }
      }.call(this)
    );
  }

  /**
   * Equivalent to `.slice(0, count)`
   */
  take(count: number): Iter<T> {
    return this.slice(0, count);
  }
}

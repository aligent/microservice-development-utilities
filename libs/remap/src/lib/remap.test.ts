import remap from './remap';

describe('remap', () => {
  it('remaps an object with one value', () => {
    const obj = { foo: 7 };
    const map = [
      ['foo', 'bar']
    ] as const;
    const newObj = remap(obj, map);
    expect(newObj).toEqual({ bar: 7 });
  });

  it('uses a remap function', () => {
    const obj = { foo: 7 };
    const map = [
      ['foo', 'bar', (val: number) => val * 2]
    ] as const;
    const newObj = remap(obj, map);
    expect(newObj).toEqual({ bar: 14 });
  });

  it('remaps through multiple levels', () => {
    const obj = {
      foo: {
        bar: 5
      }
    };
    const map = [
      ['foo.bar', 'baz']
    ] as const;
    const newObj = remap(obj, map);
    expect(newObj).toEqual({ baz: 5 });
  });

  it('Passes whole object to function when the source key is blank', () => {
    const obj = { foo: 7, bar: 3 };
    const fn = vitest.fn((val: typeof obj) => {
      return val.foo + val.bar;
    });
    const map = [
      ['', 'foo', fn]
    ] as const;
    const newObj = remap(obj, map);
    expect(newObj).toEqual({ foo: 10 });
    expect(fn).toHaveBeenCalledWith(obj);
  });

  it('creates arrays when .# is used', () => {
    const obj = { foo: 1, bar: 2, baz: 7 };
    const map = [
      ['foo', 'foo.0'],
      ['bar', 'foo.1'],
      ['baz', 'foo.2']
    ] as const;
    const newObj = remap(obj, map);
    expect(newObj).toEqual({ foo: [1, 2, 7] });
  });

  it('follows the logic in the example code in the docs', () => {
    const map = [
      ['foo', 'baz'],
      ['bar', 'qux.0', (x: number) => x + 1]
    ] as const;
    const obj = { foo: 'hi', bar: 7 };
    expect(remap(obj, map)).toEqual({ baz: 'hi', qux: [8] });
  });
});

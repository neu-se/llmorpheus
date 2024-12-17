/**
 * An ISorter is an algorithm for sorting an array.
 */
export default interface ISorter<E> {
  sort(list: E[], compareFunction: (e1: E, e2: E) => number): void;
}

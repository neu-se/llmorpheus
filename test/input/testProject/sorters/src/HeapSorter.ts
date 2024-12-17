import ISorter from './ISorter';

/**
 * An implementation of HeapSort.
 */
export default class HeapSorter<E> implements ISorter<E> {

  public constructor(){
    console.log('*** creating HeapSorter ***');
  }

  public sort(list: E[], compareFun: (e1: E, e2: E) => number): void {
    this.heapify(list, list.length, compareFun); // place list in max-heap order
    for (let end: number = list.length - 1; end > 0; end--){
      this.swap(list, end, 0);   // swap largest element at list[0] with list[end]
      this.siftDown(list, 0, end - 1, compareFun); // restore heap invariants for list[0..end-1]
    }
  }

  /**
   * establishes heap invariants for list elements up to specified index. start
   * sifting down from the last index that is a parent, i.e. index/2 - 1
   */
  private heapify(list: E[], index: number, compareFun: (e1: E, e2: E) => number): void {
    for (let i: number = Math.floor(index / 2) - 1; i >= 0; i--){
      this.siftDown(list, i, index - 1, compareFun);
    }
  }

  /**
   * orders the element at list[start] correctly w.r.t. its children, at list[2*start+1]
   * and list[i] > list[2*start+2] (recursively) by swapping elements until this is the case.
   * Do this up to length.
   */
  private siftDown(list: E[], start: number, end: number, compareFun: (e1: E, e2: E) => number): void {
    const left: number = 2 * start + 1;
    const right: number = 2 * start + 2;

    let max: number = start;
    if (left <= end && compareFun(list[left], list[max]) > 0) {
      max = left;
    }
    if (right <= end && compareFun(list[right], list[max]) > 0) {
      max = right;
    }
    if (max !== start) {
      this.swap(list, start, max);
      this.siftDown(list, max, end, compareFun);
    }
  }

  private swap(list: E[], x: number, y: number): void {
    const temp: E = list[x];
    list[x] = list[y];
    list[y] = temp;
  }
}

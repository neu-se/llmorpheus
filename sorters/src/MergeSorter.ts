import ISorter from './ISorter';

/**
 * An implementation of merge-sort
 */
export default class MergeSorter<E> implements ISorter<E> {

  public constructor(){
    console.log('*** creating MergeSorter ***');
  }

  public sort(list: E[], compareFun: (e1: E, e2: E) => number): void {
    this.mergesort(list, 0, list.length, compareFun);
  }

  /**
   * calls itself recursively on its two halves. base case is when
   * list is of length <= 1. recursive case merges the two sorted
   * sublists
   */
  public mergesort(list: E[], start: number, length: number, compareFun: (e1: E, e2: E) => number): void {
    if (length > 1){
      this.mergesort(list, start, Math.floor(length / 2), compareFun);
      this.mergesort(list, start + Math.floor(length / 2), length - Math.floor(length / 2), compareFun);
      this.merge(list, start, Math.floor(length / 2), length - Math.floor(length / 2), compareFun);
    }
  }

  /**
   * pre: assumes that list[start..start+leftNr-1] and list[start+leftNr..start+leftNr+rightNr-1]
   * are sorted, and merges them. An auxiliary array temp is used to stored the elements before
   * copying them back.
   */
  private merge(list: E[], start: number, leftNr: number, rightNr: number, compareFun: (e1: E, e2: E) => number): void {
    const temp: E[] = []; // alternative: allocate a single array in sort() to avoid repeated allocation and deallocation of arrays
    let leftIndex: number = start;
    let rightIndex: number = start + leftNr;
    let tempIndex: number = 0;
    while (leftIndex < start + leftNr || rightIndex < start + leftNr + rightNr){
      if (leftIndex === start + leftNr){
        temp[tempIndex] = list[rightIndex++];
      } else if (rightIndex === start + leftNr + rightNr){
        temp[tempIndex] = list[leftIndex++];
      } else if (compareFun(list[leftIndex], list[rightIndex]) < 0){
        temp[tempIndex] = list[leftIndex++];
      } else {
        temp[tempIndex] = list[rightIndex++];
      }
      tempIndex++;
    }
    for (let i: number = 0; i < leftNr + rightNr; i++){
      list[start + i] = temp[i];
    }
  }
}

import ISorter from './ISorter';

export default class QuickSorter<E> implements ISorter<E> {

  public constructor(){
    console.log('*** creating QuickSorter ***');
  }

  public sort(list: E[], compareFun: (e1: E, e2: E) => number): void{
    this.quicksort(list, 0, list.length - 1, compareFun);
  }

  private quicksort(list: E[], left: number, right: number, compareFun: (e1: E, e2: E) => number): void {
    if (left < right){
      const pivot: number = Math.floor((left + right) / 2);
      const newPivot: number = this.partition(list, left, right, pivot, compareFun);
      this.quicksort(list, left, newPivot - 1, compareFun);
      this.quicksort(list, newPivot + 1, right, compareFun);
    }
  }

  private partition(list: E[], left: number, right: number, pivot: number, compareFun: (e1: E, e2: E) => number): number {
    const pivotValue: E = list[pivot];
    this.swap(list, right, pivot); // move pivot to the end
    let storeIndex: number = left;
    for (let i: number = left; i < right; i++){
      if (compareFun(list[i], pivotValue) <= 0){
        this.swap(list, i, storeIndex);
        storeIndex++;
      }
    }
    this.swap(list, storeIndex, right);
    return storeIndex;
  }

  private swap(list: E[], x: number, y: number): void {
    const temp: E = list[x];
    list[x] = list[y];
    list[y] = temp;
  }
}

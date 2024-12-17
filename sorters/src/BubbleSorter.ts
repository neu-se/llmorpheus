import ISorter from './ISorter';

/**
 * BubbleSorter implements the ISorter interface using
 * the inefficient bubble-sort algorithm.
 */
export default class BubbleSorter<E> implements ISorter<E> {

  public constructor(){
    console.log('*** creating BubbleSorter ***');
  }

  public sort(list: E[], compareFun: (e1: E, e2: E) => number): void {
    const n: number = list.length;
    for (let i: number = 0; i < n - 1; i++){
      for (let j: number = 0; j < n - i - 1; j++){
        if (compareFun(list[j], list[j + 1]) > 0){
          const temp: E = list[j];
          list[j] = list[j + 1];
          list[j + 1] = temp;
        }
      }
    }
  }
}

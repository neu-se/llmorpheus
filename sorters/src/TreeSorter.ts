import ISorter from './ISorter';

/**
 * An implementation of tree-sort.
 */
export default class TreeSorter<E> implements ISorter<E> {

  public constructor(){
    console.log('*** creating TreeSorter ***');
  }

  /**
   * inserts elements into binary tree. uses recursive in-order traversal
   * of the tree to retrieve elements in sorted order
   */
  public sort(list: E[], compareFun: (e1: E, e2: E) => number): void {
    if (list.length > 1){
      // eslint-disable-next-line @typescript-eslint/no-use-before-define
      const tree: Tree<E> = new Tree<E>(list[0]);
      for (let i: number = 1; i < list.length; i++){
        tree.insert(list[i], compareFun);
      }
      tree.copyInto(list, 0);
    }
  }
}

class Tree<E> {
  private value: E;
  private left: Tree<E>;
  private right: Tree<E>;

  public constructor(v: E){
    this.value = v;
    this.left = null;
    this.right = null;
  }
  public insert(v: E, compareFun: (e1: E, e2: E) => number): void {
    if (compareFun(v, this.value) < 0) {
      if (this.left != null){
        this.left.insert(v, compareFun);
      } else {
        this.left = new Tree(v);
      }
    } else {
      if (this.right != null){
        this.right.insert(v, compareFun);
      } else {
        this.right = new Tree(v);
      }
    }
  }

  /**
   * returns index at which to insert next element
   */
  public copyInto(list: E[], index: number): number {
    let newIndex: number = index;
    if (this.left != null){
      newIndex = this.left.copyInto(list, newIndex);
    }
    list[newIndex++] = this.value;
    if (this.right != null){
      newIndex = this.right.copyInto(list, newIndex);
    }
    return newIndex;
  }
}

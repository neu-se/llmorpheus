import ISorter from '../ISorter';
import TreeSorter from '../TreeSorter';
import { expect } from 'chai';

function compare(s1: string, s2: string): number {
  if (s1 === undefined && s2 === undefined){
    return 0;
  } else if (s1 === undefined){
    return 1;  // regular values are bigger than undefined
  } else if (s2 === undefined){
    return -1; // regular values are bigger than undefined
  } else {
    return s1.localeCompare(s2);
  }
}

describe('big test suite', (): void => {

  it('sort an empty array of strings', (): void => {
    const sorter: ISorter<string> = new TreeSorter<string>();
    const list: Array<string> = [];
    sorter.sort(list, (s1: string, s2: string): number => s1.localeCompare(s2));
    expect(list).to.have.members([]);
  });

  it('sort an array containing one string', (): void => {
    const sorter: ISorter<string> = new TreeSorter<string>();
    const list: Array<string> = ['foo'];
    sorter.sort(list, compare);
    expect(list).to.have.members(['foo']);
  });

  it('sort an array containing three strings', (): void => {
    const sorter: ISorter<string> = new TreeSorter<string>();
    const list: Array<string> = ['foo', 'bar', 'baz'];
    sorter.sort(list, compare);
    expect(list).to.have.members(['bar', 'baz', 'foo']);
  });

  it('sort an array containing multiple strings', (): void => {
    const sorter: ISorter<string> = new TreeSorter<string>();
    const list: Array<string> = ['dog', 'cat', 'pig', 'cow', 'horse' ];
    sorter.sort(list, compare);
    expect(list).to.have.members(['cat', 'cow', 'dog', 'horse', 'pig' ]);
  });

  it('sort an array containing two strings and undefined', (): void => {
    const sorter: ISorter<string | undefined> = new TreeSorter<string | undefined>();
    const list: Array<string | undefined> = ['foo', undefined, 'baz'];
    sorter.sort(list, compare);
    expect(list).to.have.members(['baz', 'foo', undefined]);
  });

  it('sort an array containing two numbers', (): void => {
    const sorter: ISorter<number> = new TreeSorter<number>();
    const list: Array<number> = [17, 3];
    sorter.sort(list, (n1: number, n2: number): number => n1 - n2);
    expect(list).to.have.members([3, 17]);
  });

  it('sort an array containing multiple numbers', (): void => {
    const sorter: ISorter<number> = new TreeSorter<number>();
    const list: Array<number> = [ 1, 4, 5, 3  ];
    sorter.sort(list, (n1: number, n2: number): number => n1 - n2);
    expect(list).to.have.members([1, 3, 4, 5 ]);
  });

  class Person {
    public constructor(private name: string){}
    public getName(): string {
      return this.name;
    }
  }

  it('sort an array containing user-defined types', (): void => {
    const sorter: ISorter<Person> = new TreeSorter<Person>();
    const mary: Person = new Person('Mary');
    const joe: Person = new Person('Joe');
    const abby: Person = new Person('Abby');
    const thomas: Person = new Person('Thomas');
    const list: Array<Person> = [ mary, thomas, abby, joe   ];
    sorter.sort(list, (p1: Person, p2: Person): number => p1.getName().localeCompare(p2.getName()));
    expect(list).to.have.members([abby, joe, mary, thomas ]);
  });

  it('sort an array containing user-defined types with duplicates', (): void => {
    const sorter: ISorter<Person> = new TreeSorter<Person>();
    const mary: Person = new Person('Mary');
    const joe: Person = new Person('Joe');
    const abby: Person = new Person('Abby');
    const thomas: Person = new Person('Thomas');
    const list: Array<Person> = [ joe, joe, mary, thomas, abby, joe   ];
    sorter.sort(list, (p1: Person, p2: Person): number => p1.getName().localeCompare(p2.getName()));
    expect(list).to.have.members([abby, joe, joe, joe, mary, thomas ]);
  });

  it('sort a large array of numbers', (): void => {
    const sorter: ISorter<number> = new TreeSorter<number>();
    const LARGE: number = 1000;
    const list: Array<number> = [ ];
    const expectedResult: Array<number> = [ ];
    for (let i: number = 0; i < LARGE; i++){
      list.push(i);
      expectedResult.unshift(i);
    }
    sorter.sort(list, (n1: number, n2: number): number => n1 - n2);
    expect(list).to.have.members(expectedResult);
  });

  it('sort repeatedly', (): void => {
    const sorter: ISorter<string> = new TreeSorter<string>();
    const list: Array<string> = ['dog', 'cat', 'pig', 'cow', 'horse' ];
    sorter.sort(list, compare);
    sorter.sort(list, compare);
    sorter.sort(list, compare);
    sorter.sort(list, compare);
    expect(list).to.have.members(['cat', 'cow', 'dog', 'horse', 'pig' ]);
  });
});

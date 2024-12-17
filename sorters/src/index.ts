/**
 * Sample TypeDoc comment for class MyProject
 */
export class MyProject {
  /**
   * Sample TypeDoc comment for my method.
   * Types for Params and Returns will be auto-generated
   *
   * @param arg1 Some string that goes into this method.
   * @param arg2 Some number that goes into this method.
   * @returns The number concatenated to the string.
   *
   */
  public static myMethod: (arg1: string, arg2: number) => string
    = (arg1: string, arg2: number): string => arg1 + arg2;
}

console.log(MyProject.myMethod('The number is: ', 5));

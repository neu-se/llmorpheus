
import { MyProject } from '../index';

describe('MyProject', (): void => {

  describe('myMethod()', (): void => {

    it('should return "Hello 5"', (): void => {
      expect(MyProject.myMethod('Hello ', 5)).toEqual('Hello 5');
    });

  });

});

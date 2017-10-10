var helpers = require('yeoman-test');
var path = require('path');
var assert = require('yeoman-assert');

describe('ebam:app', ()=>{
  describe('generates a project with ebam', function () {
      // assert the file exist
      // assert the file uses AMD definition
      beforeEach(()=>{
          // The object returned acts like a promise, so return it to wait until the process is done
          return helpers.run(path.join(__dirname, '../generators/app'))
            //.withOptions({ foo: 'bar' })    // Mock options passed in
            //.withArguments(['name-x'])      // Mock the arguments
            .withPrompts({
                coffee: false,
                name: 'testing',
                description: '',
                keywords: 'one,two',
                entry: 'src/index.js',
                'test.dir': 'test',
                'test.src': 'src.js',
                'test.dist': 'code.js',
                'extraFiles': true
            }); // Mock the prompt answers
        });

        it('creates files', ()=>{
              const expected = [
                'package.json',
                'README.md',
                '.gitignore',
                '.npmignore'
              ];

              assert.file(expected);
        });

        it('has test script', ()=>{
            assert.fileContent(
                'test/index.html',
                '<script src="code.js"></script>'
            );
        });

        it('creates package.json properties', ()=>{
              assert.jsonFileContent(
                  'package.json', {
                      name: 'testing',
                      description: '',
                      keywords: ['one', 'two'],
                      "ebam": {
                        "entry": "src/index.js",
                        "test": {
                          "dest": "test/code.js",
                          "src": "test/src.js"
                        },
                        "transforms": {
                          "dangerousForOf": false,
                          "dangerousTaggedTemplateString": false
                        }
                      }
                  }
              );
        });
  });
});

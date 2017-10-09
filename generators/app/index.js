const Generator = require('yeoman-generator');
const extend = require('deep-extend');
const arrayUnion = require('array-union');
const gitRemoteOriginUrl = require('git-remote-origin-url');
const chalk = require('chalk');
const prettyjson = require('prettyjson');
const WARNING = chalk.bold.red('WARNING!');

module.exports = class extends Generator {

    constructor(args, opts){
        super(args, opts);
        // Add an --option
        //this.option('babel');
    }
    initializing(){
        const pkg = this.pkg = this.fs.readJSON(this.destinationPath('package.json'), {});
        this.props = {};
        this.pkg.name = pkg.name || this.appname; // Default to current folder name
        this.pkg.description = pkg.description || '';
        const keywords = pkg.keywords || [];
        this.pkg.keywords = keywords.length
            ? keywords.join(',') : '';
        this.pkg.version = pkg.version || '1.0.0';
        this.pkg.scripts = this.pkg.scripts || {};
        this.pkg.scripts.build = 'ebam';
        this.pkg.scripts.test = this.pkg.scripts.test || 'echo "no test"';
        this.pkg.license = this.pkg.licence || 'MIT';

        return gitRemoteOriginUrl().then(url => {
            if(this.pkg.repository === void 0){
                this.pkg.repository = {
                  type: "git",
                  url
                };
            }

        }).catch(()=>{
            this.log(chalk.yellow(`No remote git repo.`));
        });
    }
    prompting(){
        this.log(`
${chalk.bold(`Please install ebam with "npm install -g ebam" if you haven't already.`)}

After you've used "yo ebam" you can use "npm run build"
in the current directory.

${WARNING}: ${chalk.bold(`ebam will change the fields
"main", "jsnext:main", and "module" in your package.json.`)}

ebam uses buble to transpile javascript.
See the documentation for the buble js transpiler
${chalk.cyan(`(https://buble.surge.sh/)`)}.

See the documentation for ebam
${chalk.cyan(`(https://github.com/hollowdoor/ebam)`)}.
`);

const firstMessage = `Do you wish to continue?
If you do not then input Ctrl-c
Hit the enter key to continue
`;

        return this.prompt([{
          type    : 'input',
          name    : 'create',
          message : firstMessage
        },{
          type    : 'input',
          name    : 'name',
          message : 'Your project name',
          default : this.pkg.name
        },{
          type    : 'input',
          name    : 'description',
          message : 'Describe your project',
          default : this.pkg.description
        },{
          type    : 'input',
          name    : 'gituser',
          message : 'Provide your github username?',
          store   : true
        },{
          type    : 'input',
          name    : 'keywords',
          message : 'Provide a list of searchable keywords',
          default : this.pkg.keywords
        },{
          type    : 'input',
          name    : 'entry',
          message : 'Tell ebam what file to transpile',
          default : 'src/index.js',
        },{
          type    : 'confirm',
          name    : 'transforms.dangerousForOf',
          message : 'Enable buble dangerousForOf?',
          default : false
        },{
          type    : 'confirm',
          name    : 'transforms.dangerousTaggedTemplateString',
          message : 'Enable buble dangerousTaggedTemplateString?',
          default : false
        },{
          type    : 'confirm',
          name    : 'testBuild',
          message : 'Do you want ebam to compile tests for the browser? A <test directory>/index.html file will be created.'
        },{
          type    : 'input',
          name    : 'test.dir',
          message : 'Tell ebam what directory to store test files',
          default : 'test',
          when(answers){
              return answers.testBuild;
          }
        },{
          type    : 'input',
          name    : 'test.src',
          message : 'Tell ebam the name of the test file to transpile',
          default : 'src.js',
          when(answers){
              return answers.testBuild;
          }
        },{
          type    : 'input',
          name    : 'test.dest',
          message : 'Tell ebam the name of the transpiled test file',
          default : 'code.js',
          when(answers){
              return answers.testBuild;
          }
       },{
         type    : 'confirm',
         name    : 'extraFiles',
         message : 'Create README.md, .gitignore, .npmignore files?',
         default : true
       },{
         type    : 'input',
         name    : 'license',
         message : 'Project license?',
         default : this.pkg.license
      }]).then((answers) => {
            this.answers = answers;
          //this.log('app name', answers.name);
          //this.log('cool feature', answers.cool);
        });
    }
    writing(){

        const pkg = this.pkg;
        const genpkg = require('./templates/package.json');

        const keywords = this.answers.keywords.length
            ? this.answers.keywords.split(',').map(s=>s.trim())
            : [];

        extend(pkg, {
            name: this.answers.name,
            description: this.answers.description,
            ebam: {
                entry: this.answers.entry,
                transforms: this.answers.transforms
            },
            license: this.answers.license
        });

        pkg.keywords = arrayUnion(pkg.keywords || [], keywords);

        if(!pkg.author && this.user.git.name()){
            pkg.author = this.user.git.name()
            + ` <${this.user.git.email()}>`;

            if(this.answers.gituser){
                this.pkg
                .author += ` (https://${this.answers.gituser}.github.io)`;
            }
        }

        let testdir, dest, src;


        if(this.answers.testBuild){
            testdir = this.answers.test.dir;
            dest = [testdir, this.answers.test.dest].join('/');
            src = [testdir, this.answers.test.src].join('/');

            pkg.ebam.test = {
                dest, src
            };
        }

        this.log('\nThe new package.json contents:');
        this.log(prettyjson.render(pkg, {
            dashColor: 'magenta'
        }));
        //this.log('\n'+JSON.stringify(pkg, null, '  ')+'\n');

        return this.prompt([{
          type    : 'confirm',
          name    : 'useEbam',
          message : 'Continue with this package.json configuration?'
        }]).then(answers=>{
            if(answers.useEbam){
                if(this.answers.testBuild){

                    this.fs.write(this.destinationPath(src), '');
                    this.fs.write(this.destinationPath([testdir, 'styles.css'].join('/')), '');

                    this.fs.copyTpl(
                        this.templatePath('test/index.html'),
                        this.destinationPath([testdir, 'index.html'].join('/')),
                      { script: dest }
                    );
                }



                this.fs.writeJSON(this.destinationPath('package.json'), pkg);

                this.fs.write(this.destinationPath(this.answers.entry), '');
                if(this.answers.extraFiles){
                    this.fs.write(this.destinationPath('README.md'), '');
                    this.fs.copy(
                        this.templatePath('gitignore'),
                        this.destinationPath('.gitignore')
                    );

                    this.fs.copy(
                        this.templatePath('npmignore'),
                        this.destinationPath('.npmignore')
                    );
                }
            }
        });
    }
    end(){
        this.log('One more thing');
        this.log('Make sure to install ebam with: npm install -g ebam');
    }
};

 
/*******************************************************************************
 *
 * June 29th 2016
 *
 * Compilation process:
 *
 * The end user calls the start method passing it his annoted class and the
 * output path in which he wishes that the compiler creates his files. The start
 * method * creates an instance of the compiler with the model object (the
 * object in the annotation) and the output path. During its construction, the
 * compiler set its environment paths (setEnvironment) and build its context
 * that will be used in the templating process (buildContext). After the
 * compiler instance has been created the start method calls its compile method.
 * The compile method engage the process of files generation. It starts by
 * building the service file provided by the service developper (buildService).
 * The service file can have handlebars template tag in it and this is why we
 * need to 'build' it. It then loads dynamically (importDynamically) the new
 * version of the service file and gets the service object. The service object
 * contains the 'instructions' of the generation (commands to run, and files to
 * create). The compiler then generate the service (generate) following the step
 * described in the service object.
 *
 * Notes for tests:
 *      use the following command line:
 *      node {path to traceur.js}--annotations --array-comprehension --async-functions --async-generators --exponentiation --export-from-extended --for-on --generator-comprehension --jsx --member-variables --proper-tail-calls --require --spread-properties --types --script {path to model}
 ******************************************************************************/
let System = require('es6-module-loader').System
let fs = require('fs')
let _ = require('underscore')
let Q = require('q')
let handlebars = require('handlebars')
let exec = require('child_process').exec;
let child_process = require('child_process');
var shell = require('shelljs');
let os = require('os');
let path = require('path');

let execQ = Q.denodeify(exec);
let writeFileQ = Q.denodeify(fs.writeFile);
let readFileQ = Q.denodeify(fs.readFile);


let log = true;
let debug = false;

class Compiler {

    constructor(model, outputPath) {
        debug ? console.log('constructor') : function () { };

        if (model)
            this.model = model;
        if (outputPath)
            this.outputPath = outputPath;
        this.contexts = {};
        this.buildContext();
        this.setEnvironment();
        this.registry = null;
        process.stdout.write("output path -->" + this.outputPath + "\r\n");
        process.stdout.write("process:cwd -->" + process.cwd() + "\r\n" );
        try {
            fs.accessSync(this.outputPath + './projectRegistry', fs.F_OK);
            this.registry = JSON.parse(fs.readFileSync(this.outputPath + './projectRegistry', 'utf8'));
        } catch (e) {
            // do nothing it simply means there is no projectRegistry in the output directory
        }

    }

    // This method is the entry point of the compilation process.
    // It builds the service file, loads it and then generates the service.
    compile() {
        debug ? console.log('compile') : function () { }()

        var self = this
        this.buildService()
            .then(function () {
                return self.importDynamically(self.getServiceType(), self.serviceFile);
            })
            .then(function (serviceClass) {
                self.service = serviceClass.annotations[0];
                return self.generate();
            })
            .catch(function (error) {
                // Handle any error from all above steps
                let errorMsg = `
                COMPILE ERROR - Possible cause: 
                -> class and model definition Differences - Watch for uppercase lowercase in both.
                Example: export class nativeScript (see over) and type: "nativescript" (in .mdl file)
                `;
                log ? console.log(errorMsg + error) : function () { }();
                process.exit(1);
            })
            .done(function () {
                log ? console.log('#END') : function () { }()
            })
    }

    // This method is a wrapper to get a specific context
    // modelType should be either 'midgard' or the name of
    // a translator previously used. Otherwise, the method will
    // return undefined...
    getContext(modelType) {
        debug ? console.log('getContext(:' + "modelType:" + modelType + ") {}") : function () { }()

        return this.contexts[modelType]
    }

    // This method returns an array of nodes of type "nodeType"
    // or a single object if there's only one such node and nodeType is not
    // 'collection'. An exception should be raised if:
    //              - There's no node of type "nodeType" in the model.
    getNodesByType(nodeType) {
        debug ? console.log('getNodesByType') : function () { }()

        var nodes = _.filter(this.model, function (node) {
            return _.has(node, nodeType)
        })

        if (nodes.length === 0) {
            throw new Error(`Error: No node of type: ${nodeType}.`)
        } else if (nodes.length === 1 && nodeType !== 'collection') {
            nodes = nodes[0][nodeType];
        } else if (nodes.length > 0 && nodeType == "collection") {
            for (var i = 0; i < nodes.length; i++) {
                nodes[i] = nodes[i][nodeType];
            }
        }

        return nodes
    }

    // This method returns the type of service that is generated.
    // It will set the compiler's serviceType property (this.serviceType) if
    // it is undefined.
    getServiceType() {
        if (!this.serviceType) {
            this.serviceType = this.getNodesByType('service').type;
        }
        return this.serviceType
    }

    // This method rearrange the structure of the model object:
    //            {
    //                  server: { server node from the model },
    //                  service: { service node from the model },
    //                  collections: [ {collection 1}, {collection 2}, ... ],
    //                  platform: (a string provinding the type of operating system where this is running)
    //            }
    // This is to facilitate the navigation in the handlebars
    // and ecmaScript templating process.
    //
    // The new structure is stored in the contexts attribute.
    // The compiler can have multiple contexts depending if the
    // model has to be translated or not. The original context
    // is store as the value of the key 'midgard' and other
    // contexts are stored as the value of the key named after
    // the translator. This way, the compiler keeps track of which
    // translation has occured and doesn't have to translate the
    // model multiple time for the same translation.
    buildContext() {
        debug ? console.log('buildContext') : function () { }()
        var context = {
            server: this.getNodesByType('server'),
            service: this.getNodesByType('service'),
            collections: this.getNodesByType('collection'),
            platform: os.platform()
        }
        this.contexts.midgard = context
    }

    // This method compiles a template and returns a rendered version of it
    // using a specific context and handlebars.js
    applyTemplating(template, context) {
        debug ? console.log('applyTemplating') : function () { }()
        var renderedTemplate
        var t = handlebars.compile(template)
        renderedTemplate = t(context);
        return renderedTemplate
    }

    // This method create a file from a template using handlebars.js
    // It reads the templateFile and use the content as a template
    // and creates the fileToGen using the given context.
    writeFileHandleBars(fileToGen, templateFile, context) {
        var cwd = process.cwd();
        if (os.platform() == "win32")
            fileToGen = fileToGen.replace(/\//ig, "\\");
        else
            fileToGen = fileToGen.replace(/\\\\/ig, "/");

        log ? console.log('---------------------------------------------------------------------------------------------------') : function () { }()
        log ? console.log('generate file to :' + fileToGen) : function () { }()
        if (!path.isAbsolute(fileToGen)) {
            log ? console.log("ERROR: the output file path in 'Start' should be absolute") : function () { }()
            process.exit();
        }

        //       log ? console.log('writeFileHandleBars - templateFile:' + templateFile) : function () { }()


        try {
            var content = fs.readFileSync(templateFile, 'utf-8')
            var output = this.applyTemplating(content, context);
            console.log(output);
            // this is a hack: we replace the import line
            // of the service file for the definition of the annotation.
            // It is temporary to resolve the dynamic module loading problem.
        } catch (error) {
            log ? console.log('HANDLEBARS ERROR: ' + error) : function () { }()
            process.exit();
        }
        if (fileToGen.indexOf(this.getServiceType() + '.js') > -1) {
            var serviceFunction = 'function Service(s) {return s}';
            output = serviceFunction.concat("\r\n" + output.slice(output.indexOf('@')))
        }

        var dirname = fileToGen.match(/(.*)[\/\\]/)[1] || '';
        try {
            var stat = fs.statSync(dirname);
        } catch (e) {
            shell.mkdir('-p', dirname);
        }
        log ? console.log("OK\r\n") : function () { }()
        // return a promise
        return writeFileQ(fileToGen, output);
    }

    // executeCommands will execute only some valid commands like:
    // "copy"" or a more general "exec" command
    executeCommand(self, command, expression) {
        switch (command) {
            case "copy":
                process.stdout.write("execute command: copy:'" + [self.outputPath, parameters[0]].join('/') + "'" + "'" + [self.outputPath, parameters[0]].join('/') + "'\r\n");
                try {
                    var parameters = expression.split;
                    shell.cp([self.outputPath, parameters[0]].join('/'), [self.outputPath, parameters[1]].join('/'));
                } catch (e) {
                    console.log(`
                    ERROR trying to copy should be: copy: "sourcePath, destinationPath";
                    sourcePath and destinationPath should be relative to the output path
                    specified in the mdl.file.
                    \r\n`);
                }
                break;
            case "exec":
                try {
                    process.stdout.write("execute command -> exec:'" + expression + "' ...(wait)\r\n");
                    debug ? console.log('Context cwd: ' + self.outputPath) : function () { }()
                    var output = child_process.execSync(expression, { cwd: self.outputPath });
                    process.stdout.write(output);
                    break;
                } catch (e) {
                    process.stderr.write("\t\tERROR processing command: " + command + " -> " + e + "\r\n");
                    break;
                }
            default:
                process.stdout.write("ERROR -> Invalid command: " + command + "\r\n");
        }
    }
    // This method executes all the commands of a target
    // of the service object containing execute in its name
    // (normally executePre or executePost). The commands will be ran
    // sequentially since one command can be dependent of another.
    execute(target) {
        process.stdout.write('---------------------------------------------------------------------------------------------------\r\n');
        process.stdout.write('Processing section ' + '("' + target + '")\r\n');
        // gather all the commands to execute...
        var commands = []
        for (var key in this.service[target]) {
            var object = {};
            object[key] = this.service[target][key];
            //commands.push(this.service[target][key])
            commands.push(object)
        }
        // execute all the commands sequentially returning
        // a promise who will be rejected if a command fails.
        var self = this
        return commands.reduce(function (previous, current) {
            return previous.then(function (data) {
                for (key in current) {
                    switch (target) {
                        case "runonce":
                            if (!self.registry) {
                                self.executeCommand(self, key, current[key]);
                                self.registry = self.service.runonce;
                                fs.writeFileSync(self.outputPath + '/projectRegistry', JSON.stringify(self.registry));
                            } else
                                process.stdout('already processed\r\n');
                            break;
                        case "executePre":
                        case "executePost":
                            self.executeCommand(self, key, current[key]);
                            break;
                    }
                }
            })
        }, Q())
    }

    // This method builds the service file. The service file can have
    // handlebars template tags in it and this is why we need to "build"
    // a new version of it. The new version will be created under the services
    // directory. After the creation of the new service file, we will have to
    // dynamically load it.
    buildService() {
        log ? console.log('---------------------------------------------------------------------------------------------------') : function () { }()
        log ? console.log('buildService') : function () { }()
        var service = this.getServiceType();
        var originalServiceFile = [this.serviceTemplatesPath, service].join('/') + '.js'
        this.serviceFile = [this.servicesPath, service].join('/') + '.js'
        return this.writeFileHandleBars(this.serviceFile, originalServiceFile
            , this.getContext('midgard'))
    }

    // This method dynamically load a component from a module.
    // name is the name of the component and path is the path
    // to the module to be loaded.
    // Say we have dynamically load this module (/path/to/myModule.js):
    //      export function myFunc(myArg){
    //          return `Hello, ${myArg}!`
    //      }
    // importDynamically('myFunc', '/path/to/myModule.js') will return
    // the myFunc function.
    importDynamically(name, path) {
        debug ? console.log('ImportDynamically') : function () { }()

        var self = this
        var _name = name;
        // activate traceur options...
        System.traceurOptions = {
            'annotations': true
            , 'array-comprehension': true
            , 'async-functions': true
            , 'async-generators': true
            , 'exponentiation': true
            , 'export-from-extended': true
            , 'for-on': true
            , 'generator-comprehension': true
            , 'jsx': true
            , 'member-variables': true
            , 'proper-tail-calls': true
            , 'require': true
            , 'spread-properties': true
            , 'types': true
        }
        // add the module to the System path
        System.paths[name] = "file:///" + path;
        return System.import(name).then(function (module) {
            return Q(module[name])
        })
    }

    // This method returns the generator object received in second arg
    // (containing the fileToGen and the templateFile ) with an added property: 
    // context. If it's the first time that the model is translated with the
    // translator (first arg), the translator file will be loaded dynamically
    // and the imported function will be called with the original context. A
    // new entry will also be created in the contexts attribute.
    //
    // Then, the context property of the genObj will be set to the right context
    // and the genObj will be returned.
    translate(translator, genObj) {
        debug ? console.log('translate') : function () { }()

        var promise = Q(genObj)
        var self = this
        if (this.getContext(translator) === undefined) {
            // The translator file should always be in the translator
            // directory and be "translatorFunctionName.js".
            var translatorFile = [this.translatorsPath, translator].join('/')
                .concat('.js')
            promise = this.importDynamically(translator, translatorFile)
                .then(function (translate) {
                    self.contexts[translator] = translate(self.getContext('midgard'))
                    return Q(genObj)
                })
        }
        return promise.then(function (genObj) {
            if (genObj.context == null)
                genObj.context = self.getContext(translator)
            return Q(genObj)
        })
    }

    // This method creates a file from an handlebars template. To do
    // so, it create a generator object (containing the fileToGen and
    // the template file) and call the translate method with the right
    // translator and the genObj. Note that the translate method will
    // be called even if there's no translate property in the fileObj
    // because the right context has to be passed to the writeFileHandleBars
    // method.
    genWithHandleBars(file, fileObj, context) {
        debug ? console.log('genWithHandleB') : function () { }()

        // get the translator name or midgard if there's no translate
        // property in the fileObj.
        var translator = fileObj.translate ? fileObj.translate : 'midgard'
        var genObj = {
            fileToGen: file,
            template: fileObj.handlebars,
            context: context
        }
        var self = this
        return this.translate(translator, genObj)
            .then(function (genObj) {
                var fileToGen = genObj.fileToGen
                var template = [self.midgardPath, genObj.template].join('/')
                var context = genObj.context
                return self.writeFileHandleBars(fileToGen, template, context)
            })
    }

    // This method creates a file from an ecmaScript literal template.
    // The template is returned by a function in a dynamically loaded module.
    // The function in the module to be loaded has to have the same 
    // name as the the file in the fileObj.
    // Say we have that fileObj: myFile: {ecmaScript: 'path/to/index.js'}
    // where 'path/to/index.js' contains the function returning the template.
    // The function has to be name 'index'. The imported function will
    // always be called with the midgard context as its first and only
    // arg.
    genWithES(file, fileObj) {
        debug ? console.log('genWithES') : function () { }()

        var templateFile = fileObj.ecmaScript
        // get the name of the function.
        var templator = templateFile.split('/').pop().replace(/\.js/, '')
        var self = this
        return this.importDynamically(templator, templateFile)
            .then(function (templator) {
                return writeFileQ(file, templator(self.contexts.midgard))
            })
    }

    // This method creates a file containing a class specification for each
    // schema contained in the model file.
    // these classes shouldn't be modified because they will be automatically generated and
    // thus overwritten. Instead, these classes can be inherited and their members overloaded
    // to change their behavior.
    // This method returns a file promise to a file named "classes.js" to be
    // written in the output directory.The buffer contains the content of the file.
    genWithModel(file, fileObj, collections) {
        debug ? console.log('genWithModel') : function () { }()

        var buffer = "";
        buffer = "//--------------------------------------------------------------\r\n";
        buffer += "// module containing the data model automatically produced by\r\n";
        buffer += "// the magic code generator\r\n";
        buffer += "//--------------------------------------------------------------\r\n";
        buffer += "\r\n";
        buffer += "module.exports = {\r\n\r\n";
        for (var i = 0; i < collections.length; i++) {
            buffer += "\t" + collections[i].name + "Model : {\r\n";
            var itemNbr = 0;
            for (var property in collections[i].model) {
                buffer += "\t\t" + property + ": {";
                var index = 0;
                var nbrModelItems = Object.keys(collections[i].model).length;
                var NbrProperties = Object.keys(collections[i].model[property]).length;
                for (var item in collections[i].model[property]) {
                    switch (item) {
                        case ("type"):
                            var value = collections[i].model[property][item].name;
                            buffer += item + ":" + value;
                            break;
                        case ("enum"):
                            buffer += item + ": [";
                            var option = collections[i].model[property][item];
                            for (var j = 0; j < option.length; j++) {
                                buffer += '"' + option[j] + '"';
                                if (j < option.length - 1)
                                    buffer += ", ";
                            };
                            buffer += "]";
                            break;
                        default:
                            var value = null;
                            value = collections[i].model[property][item];
                            if (value == true)
                                buffer += item + ":" + value;
                            else
                                buffer += item + ":" + '"' + value + '"';
                    }
                    index++;
                    if (index < NbrProperties)
                        buffer += ", ";
                }
                itemNbr++;
                if (itemNbr < nbrModelItems)
                    buffer += "},\r\n";
                else
                    buffer += "}\r\n";
            }
            if (i < collections.length - 1)
                buffer += "\t},\r\n\r\n";
            else
                buffer += "\t}\r\n\r\n";
        }
        buffer += "}\r\n";
        return writeFileQ(file, buffer);
    }


    // This method iterates over the compiler's service.files property
    // (this.service.files) and dispatch the creation of the file to
    // the good method, according to their fileObj.
    // myFile.js: {handlebars: 'path/to/handlebarsTemplate.js'} will be dispatched
    // to genWithHandleB()
    // myFile2.js: {ecmaScript: 'path/to/ecmaScriptTemplate.js'} will be
    // dispatched to genWithES(). The method returns a promise of the creation of
    // all of the files in the service.files object.
    generateFiles() {
        debug ? console.log('generateFiles') : function () { }()

        var files = Object.keys(this.service.files)
        var self = this
        return Q.all(files.map(function (file, index) {
            var fileObj = self.service.files[file];
            var fileToGen = [self.outputPath, file].join('/');
            var collections = self.contexts.midgard.collections;
            if (fileObj.ecmaScript) {
                return self.genWithES(fileToGen, fileObj)
            } else if (fileObj.handlebars) {
                return self.genWithHandleBars(fileToGen, fileObj, findCollection(collections, fileObj.name));
            } else if (fileObj.model) {
                return self.genWithModel(fileToGen, fileObj, collections);
            }
        }));
        function findCollection(collections, name) {
            if (name == null)
                return null;
            for (var i = 0; i < collections.length; i++) {
                if (collections[i].name == name)
                    return collections[i];
            }
            return null;
        }
    }

    // This method iterates over the service object properties and
    // trigger the right method according to the property name. Note
    // that every properties will be processed sequentially since
    // some execute commands might need generated files from the files
    // property and vice-versa.
    // processing priorities:
    //  1) Before anything else "runonce" is executed. However,
    //     in this case, it is executed only one time. This ca be used to install
    //     the proper environment to the ouputed files.
    // 2) "executePre" is to be placed as first operations
    //     execute pre will be executed for each build.
    // 3) "files" are files to be transformed either with handlebar or with an ecmaScript.
    // 4) "executePost" is executed in the end and will be executed for each build.
    generate() {
        debug ? console.log('generate') : function () { }()

        var targets = Object.keys(this.service)
        var self = this
        return targets.reduce(function (previous, target) {
            return previous.then(function () {
                if (/runonce/.test(target)) {
                    return self.execute(target)
                } else if (/execute/.test(target)) {
                    return self.execute(target)
                } else if (target === 'files') {
                    return self.generateFiles()
                }
            })
        }, Q())
    }

    // This method sets paths that will be used during the compilation process.
    // Every files in the service.files object should be in the serviceTempaltes
    // folder, every translator should be in the serviceTemplates/translators
    // folder and the new version of the service file will be created in the
    // services folder. Those folders has to be created prior to the compilation
    // (the compiler won't create it for you!). For a successful compilation, a
    // MIDGARD_PATH environment variable should be defined.
    setEnvironment() {
        if (!process.env.MIDGARD_PATH) {
            this.midgardPath = process.cwd();
        } else
            this.midgardPath = process.env.MIDGARD_PATH;
        if (!process.env.MODEL_PATH)
            this.modelPath = this.midgardPath;
        else
            this.modelPath = process.env.MODEL_PATH;
        this.midgardPath = this.midgardPath.replace(/\\/g, "/");
        //       this.midgardPath = "file://" + this.midgardPath.replace(/\\/g, "/");
        this.serviceTemplatesPath = [this.midgardPath, 'serviceTemplates', this.getServiceType()].join('/');
        this.servicesPath = [this.midgardPath, 'services', this.getServiceType()].join('/');
        this.translatorsPath = [this.midgardPath, 'serviceTemplates', 'translators'].join('/');
        if (!this.outputPath)
            this.outputPath = [this.modelPath, 'output', this.getServiceType()].join('/');
        debug ? console.log('setEnvironment() { process.cwd():' + process.cwd() + " }") : function () { }()
    }

}



/**********************
 * Handlebars helpers *
 **********************/

// This helper stringify a javascript object, so that what is printed
// in the template is not [Object object] but the object itself.
handlebars.registerHelper('toString', function (context) {
    if (typeof context === 'function') {
        return context.name
    } else if (Array.isArray(context)) {
        var array = context.join('\',\'')
        return '[\''.concat(array).concat('\']')
    } else if (typeof context === 'object') {
        return JSON.stringify(context, function (k, v) {
            if (typeof v === 'function') {
                // If the value is a function (ex: type: String)
                // it will take the name of the function as the 
                // value. Otherwise, the key/value pair would be
                // ignored and not printed...
                return v.name
            } else {
                return v
            }
        })
    } else {
        return context
    }
})

// This helper prints the property name of the property
// currently being iterated on. This helper should be called
// only inside #each block.
// ex: var context = {{type: String, required: true}}
// {{#each this}}
//      {{propertyName}}
// {{/each}}
// 
// The result:
//      type
//      required
handlebars.registerHelper('tsClassPropertyName', function (options) {
    if (options != null)
        return options.charAt(0).toUpperCase() + options.slice(1);
    else
        console.warn("classPropertyName sould include the object associated to a model property. Ex: {{classPropertyName this}}");
})

handlebars.registerHelper('tsMemberPropertyName', function (options) {
    if (options != null)
        return options.toLowerCase();
    else
        console.warn("classPropertyName sould include the object associated to a model property. Ex: {{classPropertyName this}}");
})

handlebars.registerHelper('tsPropertyType', function (options) {
    if (options == null)
        console.warn("propertyType should include the object associated to a model property. Ex: {{propertyType this}} ");
    else if (options.type != null) {
        if (options.type.name == "Date")
            return options.type.name
        else
            return options.type.name.charAt(0).toLowerCase() + options.type.name.slice(1);
    } else {
        console.warn("A property has no type. It should have one. Ex: name: {type:String, label:'Name'}");
    }
})

// for detailed comments and demo, see my SO answer here http://stackoverflow.com/questions/8853396/logical-operator-in-a-handlebars-js-if-conditional/21915381#21915381

/* a helper to execute an IF statement with any expression
  USAGE:
 -- Yes you NEED to properly escape the string literals, or just alternate single and double quotes 
 -- to access any global function or property you should use window.functionName() instead of just functionName()
 -- this example assumes you passed this context to your handlebars template( {name: 'Sam', age: '20' } ), notice age is a string, just for so I can demo parseInt later
 <p>
   {{#xif " name == 'Sam' && age === '12' " }}
     BOOM
   {{else}}
     BAMM
   {{/xif}}
 </p>
 */

handlebars.registerHelper("xif", function (expression, options) {
    return handlebars.helpers["x"].apply(this, [expression, options]) ? options.fn(this) : options.inverse(this);
});

/* a helper to execute javascript expressions
 USAGE:
 -- Yes you NEED to properly escape the string literals or just alternate single and double quotes 
 -- to access any global function or property you should use window.functionName() instead of just functionName(), notice how I had to use window.parseInt() instead of parseInt()
 -- this example assumes you passed this context to your handlebars template( {name: 'Sam', age: '20' } )
 <p>Url: {{x " \"hi\" + name + \", \" + window.location.href + \" <---- this is your href,\" + " your Age is:" + window.parseInt(this.age, 10) "}}</p>
 OUTPUT:
 <p>Url: hi Sam, http://example.com <---- this is your href, your Age is: 20</p>
*/
handlebars.registerHelper("x", function (expression, options) {
    var result;

    // you can change the context, or merge it with options.data, options.hash
    var context = this;

    // You have to use this for the current context in the expression
    // we cannot use  "with" because of the scrict mode.

    result = (function () {
        try {
            return eval(expression);
        } catch (e) {
            console.warn("Expression: {{x or {{xif " + expression + "}}\r\n --> Javascript error: " + e);
        }
    }).call(context) // to make eval's lexical this=context
    return result;
});

/* 
  if you want access upper level scope, this one is slightly different
  the expression is the JOIN of all arguments
  usage: say context data looks like this:
  	
      // data
      {name: 'Sam', age: '20', address: { city: 'yomomaz' } }
  	
      // in template
      // notice how the expression wrap all the string with quotes, and even the variables
      // as they will become strings by the time they hit the helper
      // play with it, you will immediately see the errored expressions and figure it out
  	
      {{#with address}}
          {{z '"hi " + "' ../this.name '" + " you live with " + "' city '"' }}
            {{/with}}
*/
handlebars.registerHelper("z", function () {
    var options = arguments[arguments.length - 1]
    delete arguments[arguments.length - 1];
    return Handlebars.helpers["x"].apply(this, [Array.prototype.slice.call(arguments, 0).join(''), options]);
});

handlebars.registerHelper("zif", function () {
    var options = arguments[arguments.length - 1]
    delete arguments[arguments.length - 1];
    return Handlebars.helpers["x"].apply(this, [Array.prototype.slice.call(arguments, 0).join(''), options]) ? options.fn(this) : options.inverse(this);
});



/*
 More goodies since you're reading this gist.
*/

// say you have some utility object with helpful functions which you want to use inside of your handlebars templates

var util = {

    // a helper to safely access object properties, think ot as a lite xpath accessor
    // usage: 
    // var greeting = util.prop( { a: { b: { c: { d: 'hi'} } } }, 'a.b.c.d');
    // greeting -> 'hi'

    // [IMPORTANT] THIS .prop function is REQUIRED if you want to use the handlebars helpers below, 
    // if you decide to move it somewhere else, update the helpers below accordingly
    prop: function () {
        if (typeof props == 'string') {
            props = props.split('.');
        }
        if (!props || !props.length) {
            return obj;
        }
        if (!obj || !Object.prototype.hasOwnProperty.call(obj, props[0])) {
            return null;
        } else {
            var newObj = obj[props[0]];
            props.shift();
            return util.prop(newObj, props);
        }
    },

    // some more helpers .. just examples, none is required
    isNumber: function (n) {
        return !isNaN(parseFloat(n)) && isFinite(n);
    },
    daysInMonth: function (m, y) {
        y = y || (new Date).getFullYear();
        return /8|3|5|10/.test(m) ? 30 : m == 1 ? (!(y % 4) && y % 100) || !(y % 400) ? 29 : 28 : 31;
    },
    uppercaseFirstLetter: function (str) {
        str || (str = '');
        return str.charAt(0).toUpperCase() + str.slice(1);
    },
    hasNumber: function (n) {
        return !isNaN(parseFloat(n));
    },
    truncate: function (str, len) {
        if (typeof str != 'string') return str;
        len = util.isNumber(len) ? len : 20;
        return str.length <= len ? str : str.substr(0, len - 3) + '...';
    }
};

// a helper to execute any util functions and get its return
// usage: {{u 'truncate' this.title 30}} to truncate the title 
handlebars.registerHelper('u', function () {
    var key = '';
    var args = Array.prototype.slice.call(arguments, 0);

    if (args.length) {
        key = args[0];
        // delete the util[functionName] as the first element in the array
        args.shift();
        // delete the options arguments passed by handlebars, which is the last argument
        args.pop();
    }
    if (util.hasOwnProperty(key)) {
        // notice the reference to util here
        return typeof util[key] == 'function' ?
            util[key].apply(util, args) :
            util[key];
    } else {
        log.error('util.' + key + ' is not a function nor a property');
    }
});

// a helper to execute any util function as an if helper, 
// that util function should have a boolean return if you want to use this properly
// usage: {{uif 'isNumber' this.age}} {{this.age}} {{else}} this.dob {{/uif}}
handlebars.registerHelper('uif', function () {
    var options = arguments[arguments.length - 1];
    return Handlebars.helpers['u'].apply(this, arguments) ? options.fn(this) : options.inverse(this);
});

// a helper to execute any global function or get global.property
// say you have some globally accessible metadata i.e 
// window.meta = {account: {state: 'MA', foo: function() { .. }, isBar: function() {...} } }
// usage: 
// {{g 'meta.account.state'}} to print the state

// or will execute a function
// {{g 'meta.account.foo'}} to print whatever foo returns
handlebars.registerHelper('g', function () {
    var path, value;
    if (arguments.length) {
        path = arguments[0];
        delete arguments[0];

        // delete the options arguments passed by handlebars
        delete arguments[arguments.length - 1];
    }

    // notice the util.prop is required here  
    value = util.prop(window, path);
    if (typeof value != 'undefined' && value !== null) {
        return typeof value == 'function' ?
            value.apply({}, arguments) :
            value;
    } else {
        log.warn('window.' + path + ' is not a function nor a property');
    }
});

// global if 
// usage: 
// {{gif 'meta.account.isBar'}} // to execute isBar() and behave based on its truthy or not return
// or just check if a property is truthy or not
// {{gif 'meta.account.state'}} State is valid ! {{/gif}}
handlebars.registerHelper('gif', function () {
    var options = arguments[arguments.length - 1];
    return Handlebars.helpers['g'].apply(this, arguments) ? options.fn(this) : options.inverse(this);
});

// just an {{#each}} warpper to iterate over a global array, 
// usage say you have: window.meta = { data: { countries: [ {name: 'US', code: 1}, {name: 'UK', code: '44'} ... ] } }
// {{geach 'meta.data.countries'}} {{this.code}} {{/geach}}

handlebars.registerHelper('geach', function (path, options) {
    var value = util.prop(window, arguments[0]);
    if (!_.isArray(value))
        value = [];
    return Handlebars.helpers['each'].apply(this, [value, options]);
});

// definition of the Model annotation
export function Model(model) {
    return model
}

// definition of the Service annotation
export function Service(service) { return service }

// Start function that is called by the end user.
export function Start(myModel, outputPath) {
  var model = myModel.annotations[0]
  new Compiler(model, outputPath).compile()
}

## version 0.10.5
### bug fixes
* resolved file access for the mac
* added some doc

## version 0.10.2
### bug fixes
* inclusion of the mongoose model to produce a mongoDB micro-service
* bug fixes in the code generator
* better erreur handling

## version 0.10.0
### A completely redesigned output
Now the compilation result output is displayed into the output area when the "magic code generation" is selected either from the context menu in the project explorer or in the editor's menu (upper right side of the editor's window). It now give a real-time feedback of the code generation process.

## version 0.8.0
### files modified: magicCode.js, extension.js and templates

* the extension is now modified to interact differently with the spawn process. I still have to make it real time. For the moment, the result is displayed only after all process is completed.
* I added a nativeScript template to produce native script form from a mdl model.
* the "runonce" section has been added to the @service metadata. The associated shell code is executed only one time. This is used mainly to install an output environment like, for example, nativeScript.
* the pre and post processing section are now functional again.

## version 0.7.4
### files modified: compile.js, extension.js and mongoose.js

* Modified the mongoose service template with a clear separation of the classes from the models (i.e. schemas). Now index.js, the node startup script routes the requests to classes members which can be overloaded into an descendent class. The generated classes uses schemas automatically created in a model.js file.
* The compile/code generation log is now displayed into a read only tabbed window displayed in a 2 colomn view.


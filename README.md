# Magic Code Generator

The Magic code generator produces code from models and templates. Models are defined with decorators similar to Angular.

## Features

Models are defined as javascript objects.The model definition is transformed into code with templates defined with handlebar.

This extension is actually an Alpha version and a work inp progress.

## Demo
To create a new model. 
* Create a new file with an ".mdl" extension, this indicates it is a model from which code is generated
* on the newly created editor, type CTRL + Space" (windows) or type command + Space (Mac)
* fill  properties content indicated by "<  >" or modify existing one.

See how short video below

![model](http://netfolder.com/magicCode/CreateModel.gif)

Models comprises three parts:
* A server definition
* One or several service definition¸
* One or several collection definition.
We are working hard to produce some documentation providing guidance to specify the models.

## code generator
actually only two code generator are provided, Prior to code code generation, you will have to create a directory to receive the generated content. The directory path will have to be included into the "Start" function invocation.
* mongoose: this will create a mongoose+mongoDB micro service based on the collection definition provided.
* nativeScript: a nativeScript mobile module containing the forms to be included in a project

![demo](http://netfolder.com/magicCode/demo.gif)

## Copyright
Didier PH Martin 2017
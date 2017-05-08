{{!-------------------------------------------------------------------------------------------------------
 mongoose.js 
 Description: 
          This code contain the service script used to generate code from a model 
          It produces: 
              - a server directory containing the code to run the service part for the collections
 WARNING:
          It is very important that all the following element have the SAME NAME:
              - service.type in the model definition
              - the directory containing the templates
              - the class associated to the @service decorator (see below)
          Any header added to a @service should be expressed as a handlabars comment as it is the case
          for this header.
-------------------------------------------------------------------------------------------------------}}
import {Service} from "magicCode"

@Service({
    executePre: { 
        exec: `tsc -v` 
    },
    files: {
            // server side components based on Node
            'server/index.js': {handlebars: 'serviceTemplates/mongoose/server/index.js'},
            'server/classes.js': { handlebars: 'serviceTemplates/mongoose/server/classes.js' },
            'server/model.js': { model: 'export' },
            'server/package.json': { handlebars: 'serviceTemplates/mongoose/server/package.json' },
        },
    executePost: { 
        exec: `cd server && npm install`
    },
})
export class mongoose {};


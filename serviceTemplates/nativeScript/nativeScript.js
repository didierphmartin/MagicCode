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

import {Service} from "magicCode";

@Service({
    //runonce: { install_nativeScript: "tns create testForm --ng"},
    executePre: { environment_verification: 'tns doctor' },
    files: {
        // Forms module
        'app/forms/README.md': {handlebars: 'serviceTemplates/nativeScript/client/app/forms/README.md'},
        'app/forms/form.module.ts': {handlebars: 'serviceTemplates/nativeScript/client/app/forms/form.module.ts'},
        'app/forms/form.menu.ts': {handlebars: 'serviceTemplates/nativeScript/client/app/forms/form.menu.ts'},
         'app/forms/form.routes.ts': {handlebars: 'serviceTemplates/nativeScript/client/app/forms/form.routes.ts'},
         'app/forms/model.service.ts': {handlebars: 'serviceTemplates/nativeScript/client/app/forms/model.service.ts'},
{{#each collections}}
        'app/forms/{{name}}.component.ts': { 
            handlebars: 'serviceTemplates/nativeScript/client/app/forms/form.components.ts',
            name:"{{name}}"
        }{{#if @last}}{{else}}, {{/if}}
{{/each}}
    }
})
export class nativeScript {};
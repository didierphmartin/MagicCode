import { Component } from '@angular/core';
import * as Model from "./model.service"

//----------------------------------
// Component for {{name}}
// created with Magic code generator
//----------------------------------
@Component ({
 selector: '{{name}}-form',
 template: `
<ScrollView orientation="vertical" >
    <StackLayout class="form">
        {{#each model}} 
          {{#xif "!this.hidden"}}
            {{#xif "this.type == Boolean"}}
            {{/xif}}
            {{#xif "this.type == String"}}
            <TextField class="input-field" hint="{{label}}" [(ngModel)]="model.{{@key}}" autocorrect="false" autocapitalizationType="none"></TextField>
            {{/xif}}
            {{#xif "this.type == Number"}}
            <TextField class="input-field" hint="{{label}}" [(ngModel)]="model.{{@key}}" autocorrect="false" autocapitalizationType="none"></TextField>
            {{/xif}} 
          {{/xif}} 
        {{/each}}
        <Button text="submit" class="submit-button" (tap)="submit()"></Button>
    </StackLayout>
</ScrollView>
`
})
export class {{name}}Form {

    public constructor(private {{x "this.name.toLowerCase()"}}: Model.{{tsClassPropertyName this.name}}) { 
    }

    public submit() {
        console.dump({{tsClassPropertyName this.name}}Model + "\r\n" + this.model);
    }
}

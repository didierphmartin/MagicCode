import { Component } from "@angular/core";

@Component({
    selector: "form-menu",
    styleUrls: ["./app.common.css"],
    template: `
    <page>
        <StackLayout>
            <StackLayout orientation="horizontal" class="nav">
            {{#each collections}}
                {{#xif "this.view == 'form' "}}
                <Button text="{{name}}" [nsRouterLink]="['/{{name}}']"></Button>
                {{/xif}}
            {{/each}}
            <label text="click on on one of these top buttons" class="text-center"></label>
            </StackLayout>

            <router-outlet></router-outlet>
        </StackLayout>
    </page>
    `
})
export class FormMenu {
}
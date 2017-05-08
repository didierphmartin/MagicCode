{{#each collections}}
{{#if view}}
import { {{name}}Form } from './{{name}}.component';
{{/if}}
{{/each}}
 
export const formRoutes: any = [
{{#each collections}}
    {{#if view}}
    { path: '{{name}}', component: {{name}}Form }{{#if @last}}{{else}}, {{/if}}
    {{/if}}
{{/each}}   
];
 
export const appForms: any = [
{{#each collections}} 
    {{#if view}}
    {{name}}Form{{#if @last}}{{else}}, {{/if}}
    {{/if}}
{{/each}}
];
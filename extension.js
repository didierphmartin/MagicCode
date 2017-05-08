// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
var vscode = require('vscode');
var exec = require('child_process').exec;
var fs = require('fs');

class Provider {
    constructor(output){
        this._output = output;
        this._eventEmitter = new vscode.EventEmitter(vscode.Uri);
    }
    provideTextDocumentContent(uri, token){
        return this._output;
    }
    get onDidChange() {	
        return this._eventEmitter.event;
	}
    cancel(){
        return;
    }
    dispose(){
        this._onDidChange.dispose();
    }
}

// this method is called when your extension is activated
// your extension is activated the very first time the command is executed
function activate(context) {

    // Use the console to output diagnostic information (console.log) and errors (console.error)
    // This line of code will only be executed once when your extension is activated
    console.log(' extension "magicCode" is now active!');

    // The command has been defined in the package.json file
    // Now provide the implementation of the command with  registerCommand
    // The commandId parameter must match the command field in package.json
    var disposable = vscode.commands.registerCommand('extension.magicCode', function () {
        // The code you place here will be executed every time your command is executed

        // Display a message box to the user
        if (!vscode.window.activeTextEditor) {
            vscode.window.showInformationMessage("Open a  file first to show a preview.");
            return;
        }
        let model = vscode.window.activeTextEditor.document.fileName;

        try {
            if(!fs.statSync(model).isFile()) {
                var err = model + ' is not a file'
                throw new Error(err);
            }
        } catch(e) {
            var err = model + ' file doesn\'t exist'
            throw err;
        }

        var traceurOptions = "--annotations --array-comprehension --async-functions --async-generators --exponentiation --export-from-extended --for-on --generator-comprehension --jsx --member-variables --proper-tail-calls --require --spread-properties --types --script "
        if (process.platform == "win32")
            var command = "node " + __dirname + "/node_modules/traceur/traceur ";
        else
            var command = "sudo node " + __dirname + "/node_modules/traceur/traceur ";

        var cwd = process.cwd();
        var options = { cwd: __dirname };

        var outputChannel = vscode.window.createOutputChannel('magicCodeGenerator');
        outputChannel.show();
        outputChannel.clear();
        outputChannel.append("Please wait... Now processing your request. This may take some time\n\r"); 
        var child = exec(command + traceurOptions + model, options);
        child.stdout.on('data', function(data) {
            console.log(data);
            outputChannel.append(data);
        });
        child.stderr.on('data', function(data) {
            console.log('stderr: ' + data);
            outputChannel.append(data);
        });
        child.on('close', function(code) {
            console.log('closing code: ' + code);
            outputChannel.append(code);
        });
    });

    context.subscriptions.push(disposable);
}
exports.activate = activate;

// this method is called when your extension is deactivated
function deactivate() {
}
exports.deactivate = deactivate;
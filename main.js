/*jslint vars: true, plusplus: true, devel: true, nomen: true, regexp: true, indent: 4, maxerr: 50 */
/*global define, $, brackets, window */

/** Simple extension that adds a "File > Hello World" menu item */
define(function (require, exports, module) {
    "use strict";

    var css = ".h-phantom{position:relative;}\
    .h-phantom:before{content:attr(data-color);color:inherit;background-color:inherit;pointer-events:none;position:absolute;top:0;left:0;border-radius:2px;white-space:nowrap;}";
        
    var document = window.document;
    var style = document.createElement('style');
    style.type = 'text/css';
    style.appendChild(document.createTextNode(css));
    document.head.appendChild(style);


    var CommandManager = brackets.getModule("command/CommandManager"),
        EditorManager  = brackets.getModule("editor/EditorManager"),
        Menus          = brackets.getModule("command/Menus"),
        Colorhighlighter = require('ColorHighlighter');

    const separationBlankLines = 2;
    const dateSeparator = "----------";
    const dateSeparatorRegex = /-----+/i;

    function calcDiffDays(date1, date2) {
        const oneDayDiffMilliSec = 1000*60*60*24;
        let diffMilliSec = Math.floor(Math.abs(date1 - date2));
        let diffDay = diffMilliSec/oneDayDiffMilliSec;
        return diffDay;
    }

    function getLastNonEmptyLineNumber(cachedTextArray, lineNumber) {
        let lastLine, lastLineOffSet;

        for(lastLineOffSet = 1; 
            lastLineOffSet < lineNumber && 
            (lastLine = cachedTextArray[lineNumber-lastLineOffSet]) === ""; 
            lastLineOffSet ++);

        if(lastLineOffSet < lineNumber) {
            let lastLineNumber = lineNumber - lastLineOffSet;
            return lastLineNumber;
        } else {
            return -1;
        }
    }

    function formatBlankAboveLine(cachedTextArray, lineNumber) {
        let lineNumberChange = 0;

        // Locate the last line of the current date
        let lastLine = cachedTextArray[lineNumber-1];
        let lastLineOffSet = 1;
        for(lastLineOffSet = 1; 
            lastLineOffSet < lineNumber && 
            (lastLine = cachedTextArray[lineNumber-lastLineOffSet]) === ""; 
            lastLineOffSet ++);

        let lastLineNumber = lineNumber - lastLineOffSet;

        if(lastLineOffSet < separationBlankLines){
            // Insert blank lines
            let blankLine = "";
            for(let insertionCnt = 0; insertionCnt < separationBlankLines; insertionCnt ++) {
                cachedTextArray.splice(lastLineNumber + 1, 0, blankLine);
                lineNumberChange ++;
            }
        }
        else if(lastLineOffSet > separationBlankLines) {
            // Remove extra blank lines
            for(let delCnt = separationBlankLines; delCnt < lastLineOffSet; delCnt ++) {
                cachedTextArray.splice(lastLineNumber + 1, 1);
                lineNumberChange --;
            }
        }

        return lineNumberChange;
    }
    
    // Function to run when the menu item is clicked
    function handleFunStuffFormatting() {
        var editor = EditorManager.getFocusedEditor();
        if (editor) {
            let cachedText = editor.document.getText();
            let cachedTextArray = cachedText.split("\n");

            // Set curDate to tomorrow to set today's notes conveniently
            let today = new Date();
            let curYear = today.getFullYear();
            let curDate = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1);

            for(let lineNumber = 0, lineText = ""; (lineText = cachedTextArray[lineNumber]) !== undefined; lineNumber ++) {
                console.log(lineNumber, lineText);

                let dateRegex = /[1]?\d-[1-3]?\d (Mon|Tue|Wed|Thu|Fri|Sat|Sun)/i;
                let weekRegex = /Week \d+/i;
                let yearRegex = /20\d\d/i;

                if(dateRegex.test(lineText)) {
                    console.log("Match date");
                    console.log("cur date:", curDate);

                    let newMonthDate = lineText.split(" ")[0].split("-");
                    let newMonth = parseInt(newMonthDate[0]);
                    let newDay = parseInt(newMonthDate[1]);
                    let newDate = new Date(curYear, newMonth-1, newDay);

                    // Catch missing weekdays
                    let diffDay = calcDiffDays(newDate, curDate);
                    if(diffDay > 1) {
                        // Confirm and locate the missing workday
                        let missingDate = new Date(curDate.getTime());
                        do {
                            missingDate.setDate(missingDate.getDate() - 1);
                        }while(calcDiffDays(missingDate, newDate) != 0 && (missingDate.getDay() == 0 || missingDate.getDay() == 6));

                        if(calcDiffDays(missingDate, newDate) !== 0) {
                            // Found a missing workday
                            const weekdayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
                            let missingDay = missingDate.getDate();
                            let missingMonth = missingDate.getMonth()+1;
                            let missingWeekday = missingDate.getDay();

                            let missingDateText = missingMonth + "-" + missingDay + " " + weekdayNames[missingWeekday] + ":\n";
                            missingDateText += "¯\\_(ツ)_/¯ you forgot something today";

                            cachedTextArray.splice(lineNumber, 0, missingDateText);

                            console.log("Adding a missing date: ", missingDate);

                            newDate = missingDate;
                        }
                    }

                    // Format the content 
                    if(newDay != 5) {
                        let lineNumberChange = formatBlankAboveLine(cachedTextArray, lineNumber);
                        lineNumber += lineNumberChange;

                        let separationLineNumber = getLastNonEmptyLineNumber(cachedTextArray, lineNumber);
                        let separationLine = cachedTextArray[separationLineNumber];

                        if(!dateSeparatorRegex.test(separationLine)) {
                            cachedTextArray.splice(separationLineNumber + 1, 0, dateSeparator);
                            lineNumberChange = formatBlankAboveLine(cachedTextArray, separationLineNumber+1);
                            lineNumber += lineNumberChange;
                        }
                        else {
                            cachedTextArray[separationLineNumber] = dateSeparator;
                            lineNumberChange = formatBlankAboveLine(cachedTextArray, separationLineNumber);
                            lineNumber += lineNumberChange;
                        }
                    }

                    // Update curDate
                    curDate = newDate;
                }
                else if(weekRegex.test(lineText)) {
                    console.log("Match week!");
                }
                else if(yearRegex.test(lineText)) {
                    console.log("Match year!");
                }
            }
            let joinedText = cachedTextArray.join("\n");
            editor.document.setText(joinedText);
        }
    }
    
    
    // First, register a command - a UI-less object associating an id to a handler
    var MY_COMMAND_ID = "helloworld.sayhello";   // package-style naming to avoid collisions
    CommandManager.register("Format FunStuff", MY_COMMAND_ID, handleFunStuffFormatting);

    // Then create a menu item bound to the command
    // The label of the menu item is the name we gave the command (see above)
    var menu = Menus.getMenu(Menus.AppMenuBar.FILE_MENU);
    menu.addMenuItem(MY_COMMAND_ID);
    
    // We could also add a key binding at the same time:
    //menu.addMenuItem(MY_COMMAND_ID, "Ctrl-Alt-W");
    // (Note: "Ctrl" is automatically mapped to "Cmd" on Mac)

    EditorManager.on('activeEditorChange', function (event, editor) {
        if (editor && editor._codeMirror) {
           var cm = editor._codeMirror;

           if (!cm._colorHighlighter) {
               cm._colorHighlighter = new Colorhighlighter(cm);
           }
       }
    });
});
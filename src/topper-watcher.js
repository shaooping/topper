/*
 *  BSD 3-Clause License
 *
 * Copyright (c) 2018, Sidharth Mishra
 * All rights reserved.
 *
 * Redistribution and use in source and binary forms, with or without
 * modification, are permitted provided that the following conditions are met:
 *
 * * Redistributions of source code must retain the above copyright notice, this
 *   list of conditions and the following disclaimer.
 *
 * * Redistributions in binary form must reproduce the above copyright notice,
 *   this list of conditions and the following disclaimer in the documentation
 *   and/or other materials provided with the distribution.
 *
 * * Neither the name of the copyright holder nor the names of its
 *   contributors may be used to endorse or promote products derived from
 *   this software without specific prior written permission.
 *
 * THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS"
 * AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE
 * IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE
 * DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT HOLDER OR CONTRIBUTORS BE LIABLE
 * FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL
 * DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR
 * SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER
 * CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY,
 * OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE
 * OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
 *
 * topper-watcher.js
 * @author Sidharth Mishra
 * @description Watches the files that had topper add headers.
 * @created Mon Jan 15 2018 15:51:52 GMT-0800 (PST)
 * @copyright 2017 Sidharth Mishra
 * @last-modified Tue Feb 19 2019 19:11:41 GMT-0800 (PST)
 */

const vscode = require("vscode");
const async = require("async");
const _ = require("lodash");

/**
 * From VSCode API
 * @typedef {Range} Range
 */
const Range = vscode.Range;

/**
 * From VSCode API
 * @typedef {Position} Position
 */
const Position = vscode.Position;

/**
 * @typedef {Workspace} Workspace
 */

/**
 * Starts the watcher to check for will save events.
 */
const startWatcher = () => {
    const workspace = vscode.workspace;

    workspace.onWillSaveTextDocument(textDocumentWillSaveEvent => {
        try {
            const changedFileUri = textDocumentWillSaveEvent.document.uri;
            async.waterfall([cbk => cbk(null, workspace, changedFileUri), updateLastModifiedDate], (err, cbk) => {
                if (err) return;
                else if (cbk) cbk("done");
                else console.log("Done!");
            });
        } catch (err) {
            console.log(`Error:: ${err}`);
        }
    });
};

/**
 * Updates the last-modified date section of the topper header.
 * @param {Workspace} workspace The reference to the workspace from VS Code API.
 * @param {string} filePath The file path.
 * @param {Function} cbk The callback function.
 */
const updateLastModifiedDate = (workspace, filePath, cbk) => {
    try {
        workspace.openTextDocument(filePath).then(mdFile => {
            try {
                let lines = mdFile.getText().split(/\n/);

                let lastModifiedKey = vscode.workspace.getConfiguration("topper").get("lastModified");

                // Tue Jan 16 2018 11:39:37 GMT-0800 (PST)
                // Wed Sep 26 2018 21:47:26 GMT+0200 (W. Europe Daylight Time)
                //
                const regex = new RegExp(
                    `[ ]*${lastModifiedKey}\\s*.?\\s+([A-Za-z]{3} [A-Za-z]{3} [0-9]{2} [0-9]{4} [0-9]{2}\\:[0-9]{2}\\:[0-9]{2} [A-Za-z]{3}[\\-\\+][0-9]{4} \\(\\D*\\))\\n*`
                ); // the regex

                let matches = _.filter(lines, l => l.match(regex)); //l.match(/\@last\-modified\:{0,1}\s+(.*)\n*/i));

                if (!matches || (matches && matches.length < 1)) return; // no topper header present with last-updated field

                let lmdDateLineNbr = lines.indexOf(matches[0]);

                let matchText = matches[0].match(regex)[1]; //match(/\@last\-modified\:{0,1}\s+(.*)\n*/i)[1];

                let rplcStartIndex = matches[0].indexOf(matchText); // start index of match

                let rplcEndIndex = rplcStartIndex + matchText.length; // end index of the area to replace

                let replaceRange = new Range(new Position(lmdDateLineNbr, rplcStartIndex), new Position(lmdDateLineNbr, rplcEndIndex));

                const editor = vscode.window.activeTextEditor;

                if (editor && editor.document !== mdFile) return; // the active file is not the modified file

                editor.edit(editBuilder => {
                    try {
                        editBuilder.replace(replaceRange, new Date().toString());
                        cbk(null, null);
                    } catch (err) {
                        console.log(err);
                    }
                });
            } catch (err) {
                console.log(err);
            }
        });
    } catch (err) {
        console.log(`Error while updating modified date :: ${err}`);
    }
};

exports.startWatcher = startWatcher;

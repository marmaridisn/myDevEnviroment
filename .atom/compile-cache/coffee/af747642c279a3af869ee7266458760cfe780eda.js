(function() {
  var CompositeDisposable, GitPull, GitPush, Path, cleanup, commit, destroyCommitEditor, dir, disposables, fs, getStagedFiles, getTemplate, git, notifier, prepFile, showFile, splitPane;

  CompositeDisposable = require('atom').CompositeDisposable;

  fs = require('fs-plus');

  Path = require('flavored-path');

  git = require('../git');

  notifier = require('../notifier');

  splitPane = require('../splitPane');

  GitPush = require('./git-push');

  GitPull = require('./git-pull');

  disposables = new CompositeDisposable;

  dir = function(repo) {
    return (git.getSubmodule() || repo).getWorkingDirectory();
  };

  getStagedFiles = function(repo) {
    return git.stagedFiles(repo).then(function(files) {
      if (files.length >= 1) {
        return git.cmd(['status'], {
          cwd: repo.getWorkingDirectory()
        });
      } else {
        return Promise.reject("Nothing to commit.");
      }
    });
  };

  getTemplate = function(cwd) {
    return git.getConfig('commit.template', cwd).then(function(filePath) {
      if (filePath) {
        return fs.readFileSync(Path.get(filePath.trim())).toString().trim();
      } else {
        return '';
      }
    });
  };

  prepFile = function(status, filePath) {
    var cwd;
    cwd = Path.dirname(filePath);
    return git.getConfig('core.commentchar', cwd).then(function(commentchar) {
      commentchar = commentchar ? commentchar.trim() : '#';
      status = status.replace(/\s*\(.*\)\n/g, "\n");
      status = status.trim().replace(/\n/g, "\n" + commentchar + " ");
      return getTemplate(cwd).then(function(template) {
        return fs.writeFileSync(filePath, "" + template + "\n" + commentchar + " Please enter the commit message for your changes. Lines starting\n" + commentchar + " with '" + commentchar + "' will be ignored, and an empty message aborts the commit.\n" + commentchar + "\n" + commentchar + " " + status);
      });
    });
  };

  destroyCommitEditor = function() {
    var _ref;
    return (_ref = atom.workspace) != null ? _ref.getPanes().some(function(pane) {
      return pane.getItems().some(function(paneItem) {
        var _ref1;
        if (paneItem != null ? typeof paneItem.getURI === "function" ? (_ref1 = paneItem.getURI()) != null ? _ref1.includes('COMMIT_EDITMSG') : void 0 : void 0 : void 0) {
          if (pane.getItems().length === 1) {
            pane.destroy();
          } else {
            paneItem.destroy();
          }
          return true;
        }
      });
    }) : void 0;
  };

  commit = function(directory, filePath) {
    var args;
    args = ['commit', '--cleanup=strip', "--file=" + filePath];
    return git.cmd(args, {
      cwd: directory
    }).then(function(data) {
      notifier.addSuccess(data);
      destroyCommitEditor();
      return git.refresh();
    })["catch"](function(data) {
      return notifier.addError(data);
    });
  };

  cleanup = function(currentPane, filePath) {
    if (currentPane.alive) {
      currentPane.activate();
    }
    disposables.dispose();
    try {
      return fs.unlinkSync(filePath);
    } catch (_error) {}
  };

  showFile = function(filePath) {
    return atom.workspace.open(filePath, {
      searchAllPanes: true
    }).then(function(textEditor) {
      if (atom.config.get('git-plus.openInPane')) {
        return splitPane(atom.config.get('git-plus.splitPane'), textEditor);
      } else {
        return textEditor;
      }
    });
  };

  module.exports = function(repo, _arg) {
    var andPush, currentPane, filePath, init, stageChanges, startCommit, _ref;
    _ref = _arg != null ? _arg : {}, stageChanges = _ref.stageChanges, andPush = _ref.andPush;
    filePath = Path.join(repo.getPath(), 'COMMIT_EDITMSG');
    currentPane = atom.workspace.getActivePane();
    init = function() {
      return getStagedFiles(repo).then(function(status) {
        return prepFile(status, filePath);
      });
    };
    startCommit = function() {
      return showFile(filePath).then(function(textEditor) {
        disposables.add(textEditor.onDidSave(function() {
          return commit(dir(repo), filePath).then(function() {
            if (andPush) {
              return GitPush(repo);
            }
          });
        }));
        return disposables.add(textEditor.onDidDestroy(function() {
          return cleanup(currentPane, filePath);
        }));
      })["catch"](function(msg) {
        return notifier.addError(msg);
      });
    };
    if (stageChanges) {
      return git.add(repo, {
        update: stageChanges
      }).then(function() {
        return init().then(function() {
          return startCommit();
        });
      });
    } else {
      return init().then(function() {
        return startCommit();
      })["catch"](function(message) {
        if (message.includes('CRLF')) {
          return startCommit();
        } else {
          return notifier.addInfo(message);
        }
      });
    }
  };

}).call(this);

//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAiZmlsZSI6ICIiLAogICJzb3VyY2VSb290IjogIiIsCiAgInNvdXJjZXMiOiBbCiAgICAiL2hvbWUvZ3NteXJuYWlvcy8uYXRvbS9wYWNrYWdlcy9naXQtcGx1cy9saWIvbW9kZWxzL2dpdC1jb21taXQuY29mZmVlIgogIF0sCiAgIm5hbWVzIjogW10sCiAgIm1hcHBpbmdzIjogIkFBQUE7QUFBQSxNQUFBLGtMQUFBOztBQUFBLEVBQUMsc0JBQXVCLE9BQUEsQ0FBUSxNQUFSLEVBQXZCLG1CQUFELENBQUE7O0FBQUEsRUFDQSxFQUFBLEdBQUssT0FBQSxDQUFRLFNBQVIsQ0FETCxDQUFBOztBQUFBLEVBRUEsSUFBQSxHQUFPLE9BQUEsQ0FBUSxlQUFSLENBRlAsQ0FBQTs7QUFBQSxFQUlBLEdBQUEsR0FBTSxPQUFBLENBQVEsUUFBUixDQUpOLENBQUE7O0FBQUEsRUFLQSxRQUFBLEdBQVcsT0FBQSxDQUFRLGFBQVIsQ0FMWCxDQUFBOztBQUFBLEVBTUEsU0FBQSxHQUFZLE9BQUEsQ0FBUSxjQUFSLENBTlosQ0FBQTs7QUFBQSxFQU9BLE9BQUEsR0FBVSxPQUFBLENBQVEsWUFBUixDQVBWLENBQUE7O0FBQUEsRUFRQSxPQUFBLEdBQVUsT0FBQSxDQUFRLFlBQVIsQ0FSVixDQUFBOztBQUFBLEVBVUEsV0FBQSxHQUFjLEdBQUEsQ0FBQSxtQkFWZCxDQUFBOztBQUFBLEVBWUEsR0FBQSxHQUFNLFNBQUMsSUFBRCxHQUFBO1dBQ0osQ0FBQyxHQUFHLENBQUMsWUFBSixDQUFBLENBQUEsSUFBc0IsSUFBdkIsQ0FBNEIsQ0FBQyxtQkFBN0IsQ0FBQSxFQURJO0VBQUEsQ0FaTixDQUFBOztBQUFBLEVBZUEsY0FBQSxHQUFpQixTQUFDLElBQUQsR0FBQTtXQUNmLEdBQUcsQ0FBQyxXQUFKLENBQWdCLElBQWhCLENBQXFCLENBQUMsSUFBdEIsQ0FBMkIsU0FBQyxLQUFELEdBQUE7QUFDekIsTUFBQSxJQUFHLEtBQUssQ0FBQyxNQUFOLElBQWdCLENBQW5CO2VBQ0UsR0FBRyxD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

//# sourceURL=/home/gsmyrnaios/.atom/packages/git-plus/lib/models/git-commit.coffee

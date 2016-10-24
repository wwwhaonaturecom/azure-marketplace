var gulp = require("gulp");
var _ = require('lodash');
var fs = require('fs');
var git = require('git-rev');
var Repo = require('git-tools');
var argv = require('yargs').argv;

var repo = new Repo(".");

gulp.task("links", (cb) => {
  function readFiles(dirname, repo, branch, onFileContent, onError) {
    fs.readdir(dirname, (err, filenames) => {
      if (err) {
        onError(err);
        return;
      }
      filenames.forEach((filename) => {
        if (fs.statSync(dirname + '/' + filename).isDirectory()) {
          readFiles(dirname + '/' + filename + '/', repo, branch, onFileContent, onError);
        }   
        else {
          if (filename.endsWith('.json') || filename.endsWith('.md')) {
            fs.readFile(dirname + filename, 'utf-8', function(err, content) {
              if (err) {
                onError(err);
                return;
              }
              onFileContent(dirname + filename, content, repo, branch);
            });
          }         
        }
      });
    });
  }

  function error(err) { }

  function replaceLinks(fileName, content, repo, branch) {  
    var link = /https:\/\/raw\.githubusercontent\.com\/.+?\/.+?\/.+?\/src/g;
    var escapedLink = /https%3A%2F%2Fraw\.githubusercontent\.com%2F.+?%2F.+?%2F.+?%2Fsrc/g;
    var newContent = content.replace(link, "https://raw.githubusercontent.com/" + repo + "/" + branch + "/src");
    newContent = newContent.replace(escapedLink, "https%3A%2F%2Fraw.githubusercontent.com%2F" + repo.replace("/", "%2F") + "%2F" + branch + "%2Fsrc");
    fs.writeFile(fileName, newContent, error); 
  }

  repo.remotes(function(error, remotes) {
    function getRepoNameFromRemotes(remotes) {
      var originRepo = _.find(remotes, (r) => { return r.name == "origin"; });
      if (!originRepo) {
        throw new Error("Attempting to get remote github repository name from git remotes. No git remote named 'origin' found.");
      }

      return originRepo.url.startsWith("https") ?
        /https:\/\/github.com\/(.+?\/.+?)\.git/.exec(originRepo.url)[1] :
        /git@github\.com:(.+?\/.+?)\.git/.exec(originRepo.url)[1];
    }

    var repoName = argv.repo || getRepoNameFromRemotes(remotes);

    git.branch(function (branch) {
      var branchName = argv.branch || branch;
      ["../src/", "../parameters/"].forEach((dir) => { readFiles(dir, repoName, branchName, replaceLinks, error) });
      fs.readFile("../README.md", 'utf-8', (err, content) => {
        if (err) {
          onError(err);
          return;
        }
        replaceLinks("../README.md", content, repoName, branchName);
      });
    });
  });

  cb();

});

/*
  minimalect
  http://github.com/groenroos/minimalect

  Copyright (c) 2013 Oskari Groenroos and contributors
  Licensed under the MIT license.
*/

// jshint globalstrict:true, node:true

"use strict";

module.exports = function (grunt) {

  grunt.initConfig({

    pkg: grunt.file.readJSON("package.json"),

    banner:'/*********************************** \n'+
      '<%= pkg.name %> \n'+
      '<%= pkg.description %> \n\n' +
      'jQuery 1.7+ required. \n' +
      'Developed by @groenroos \n' +
      'http://www.groenroos.fi \n\n' +
      'Github: <%= pkg.repository.url %> w \n\n' +
      'Licensed under the <%= pkg.license %> license.\n\n' +
      '************************************/\n',

    clean: {
      options: {
        force: true
      },
      "default": [
        "*.min.*",
        '*.css'
      ]
    },
    uglify: {
      options: {
        banner:'<%= banner %>',
        mangle: true,
        compress: true,
        preserveComments: "some"
      },
      "default": {
        files: {
          "jquery.minimalect.min.js": ["jquery.minimalect.js"]
        }
      }
    },
    sass: {                                                            // Task
      dist: {
        options:{
          style:"compressed"
        },
        files: {                                                       // Dictionary of files
          'jquery.minimalect.min.css': 'jquery.minimalect.scss'        // 'destination': 'source'
        }
      },
      dev:{
        files: {                                                       // Dictionary of files
          'jquery.minimalect.css': 'jquery.minimalect.scss'        // 'destination': 'source'
        }
      }
    },
    usebanner: {
      taskName: {
        options: {
          position: 'top',
          banner:'<%= banner %>'
        },
        files: {
          src: [ '*.css' ]
        }
      }
    }
  });

  grunt.loadNpmTasks("grunt-contrib-clean");
  grunt.loadNpmTasks("grunt-contrib-uglify");
  grunt.loadNpmTasks("grunt-contrib-jasmine");
  grunt.loadNpmTasks('grunt-contrib-sass');
  grunt.loadNpmTasks('grunt-banner');

  grunt.registerTask("default", ["clean", "uglify", "sass", 'usebanner' ]);
};

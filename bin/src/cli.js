// jshint esversion:6
/* global
 process, module, __filename, require
 */

/**
 * SiberianCMS
 *
 * @version 4.11.7
 * @author Xtraball SAS <dev@xtraball.com>
 * @site https://github.com/Xtraball
 *
 */
let clc = require('cli-color'),
    fs = require('fs'),
    nopt = require('nopt'),
    path = require('path'),
    siberian = require('../../package.json'),
    sh = require('shelljs');

const notifier = require('node-notifier'),
      http = require("http");

let platforms = [
    'android',
    'android-previewer',
    'ios',
    'ios-noads',
    'ios-previewer',
    'browser'
];

let packModules = [
    'inbox',
    'individual-push',
    'previewer',
    'stripe',
    'stripe-pe',
    'inbox',
    'module-quizz',
    'surveys',
    'socketio',
    'tiger',
    'woocommerce',
    'digital-prizm',
    'chatrooms'
];

/**
 * Defining this file path to get the SiberianCMS root project,
 * this allows to call the siberian commands from everywhere !
 */
let ROOT = path.resolve(path.dirname(__filename), '../../'),
    PWD = process.cwd(),
    DEBUG = false,
    REBUILD_MANIFEST = true,
    PHP_VERSION = 'php',
    BUILD_TYPE = '--release';


/**
 * Utility method for OSX notifications
 *
 * @param message
 * @param title
 * @returns {boolean}
 */
const notify = function (message, options) {
    const NOTIF_BASE = {
        title: "Siberian CLI",
        icon: path.join(__dirname, '../../resources/siberian/logo.300.png'), // Absolute path (doesn't work on balloons)
        sound: true, // Only Notification Center or Windows Toasters
    };

    return notifier.notify(Object.assign({}, NOTIF_BASE, {message: message}, options));
};

/**
 * Utility function to move if exists
 *
 * @param from
 * @param to
 */
let moveExists = function (from, to) {
    if (fs.existsSync(from)) {
        sh.mv(from, to);
    }
};

/**
 * Utility function
 *
 * @param question
 * @param defaultValue
 * @param callback
 */
let prompt = function (question, defaultValue, callback) {
    let stdin = process.stdin, stdout = process.stdout;

    stdin.resume();
    stdout.write(clc.blue(question + ' (default: ' + defaultValue + '): '));

    stdin.once('data', function (data) {
        let localData = data.toString().trim();
        localData = (localData !== '') ? localData : defaultValue;

        callback(localData);
    });
};

/**
 * Prints a string
 *
 * @param string
 */
let sprint = function (string) {
    console.log(string);
};

/**
 * Utility method
 *
 * @param obj
 * @returns {boolean}
 */
let isObject = function (obj) {
    return ((typeof obj === 'object') && (obj !== null));
};

/**
 * CLI entry point
 *
 * @param inputArgs
 */
let cli = function (inputArgs) {
    // Use local node_modules form the siberian command-line!
    let npmBin = ROOT + '/node_modules/.bin';
    process.env.PATH = npmBin + ':' + process.env.PATH;

    // Exit from command-line if outside project!
    if (PWD.indexOf(ROOT) === -1) {
        sprint(clc.bold(clc.green('SiberianCMS command-line interface.')));
        sprint(clc.bold(clc.red('/!\\ Warning: calling siberian outside project /!\\')));
        sprint(clc.bold(clc.red('Exiting...')));
        return;
    }

    // CLI options!
    let knownOpts =
        {
            'alias': Boolean,
            'clearcache': Boolean,
            'clearlog': Boolean,
            'cleanlang': Boolean,
            'db': Boolean,
            'dev': Boolean,
            'init': Boolean,
            'install': Boolean,
            'ions': Boolean,
            'icons': Boolean,
            'linkmodule': Boolean,
            'manifest': Boolean,
            'minify': Boolean,
            'mver': Boolean,
            'npm': Boolean,
            'pack': Boolean,
            'packall': Boolean,
            'prod': Boolean,
            'prepare': Boolean,
            'rebuild': Boolean,
            'rebuildall': Boolean,
            'syncmodule': Boolean,
            'type': Boolean,
            'test': Boolean,
            'templates': Boolean,
            'unlinkmodule': Boolean,
            'version': Boolean,
            'exportdb': Boolean
        };

    let shortHands =
        {
            'a': '--alias',
            'cc': '--clearcache',
            'cl': '--clearlog',
            'edb': '--exportdb',
            'i': '--init',
            'ic': '--icons',
            'lm': '--linkmodule',
            'ulm': '--unlinkmodule',
            'r': '--rebuild',
            'sm': '--syncmodule',
            't': '--type',
            'tpl': '--templates',
            'v': '--version'
        };

    // If no inputArgs given, use process.argv!
    let localInputArgs = inputArgs || process.argv;

    // Adding '--' to args for Cli to identify them!
    if (localInputArgs.length > 2) {
        localInputArgs[2] = '--' + localInputArgs[2].replace('-', '');
    }

    let args = nopt(knownOpts, shortHands, localInputArgs);

    if (args.version) {
        sprint(siberian.version);
    } else {
        let COPY = false;
        let RESET = false;
        let EMPTY = false;
        let INSTALL = false;
        let EXTERNAL = false;

        let remain = args.argv.remain;

        // Searching for the option debug!
        remain.forEach(function (element) {
            switch (element) {
                case 'debug':
                    DEBUG = true;
                    break;
                case 'copy':
                    COPY = true;
                    break;
                case 'empty':
                    EMPTY = true;
                    break;
                case 'reset':
                    RESET = true;
                    break;
                case 'install':
                    INSTALL = true;
                    break;
                case 'no-manifest':
                    REBUILD_MANIFEST = false;
                    break;
                case 'ext': case 'external':
                EXTERNAL = true;
                break;
                case 'build-debug':
                    BUILD_TYPE = '--debug';
                    break;
            }
        });

        if (args.rebuild) {
            if (remain.length >= 1) {
                rebuild(remain[0], COPY);
            } else {
                sprint(clc.red('Missing required argument <platform>'));
            }
        } else if (args.prepare) {
            if (remain.length >= 1) {
                rebuild(remain[0], COPY, true);
            } else {
                sprint(clc.red('Missing required argument <platform>'));
            }
        } else if (args.rebuildall) {
            platforms.forEach(function (platform) {
                rebuild(platform, COPY);
            });
        } else if (args.ions) {
            ionicServe();
        } else if (args.alias) {
            aliasHelp();
        } else if (args.exportdb) {
            exportDb();
        } else if (args.syncmodule) {
            syncModule(EXTERNAL);
        } else if (args.manifest) {
            rebuildManifest();
        } else if (args.templates) {
            moduleTemplate();
        } else if (args.type) {
            let type = '';
            if (remain.length >= 1) {
                type = remain[0].toLowerCase();
            }
            switchType(type, RESET, EMPTY);
        } else if (args.prod) {
            setProd();
        } else if (args.dev) {
            setDev();
        } else if (args.db) {
            checkDb();
        } else if (args.init) {
            init();
        } else if (args.cleanlang) {
            cleanLang();
        } else if (args.install) {
            install();
        } else if (args.pack) {
            let moduleName = null;

            if (remain.length >= 1) {
                moduleName = remain[0].toLowerCase();
            } else {
                let modulesdirIndex = PWD.indexOf(ROOT + '/modules/');
                if (modulesdirIndex >= 0) {
                    let modulesdir = ROOT + '/modules/';
                    let modulesdirLength = modulesdir.length;
                    if (PWD.length > modulesdirLength) {
                        let nextSlash = PWD.indexOf('/', modulesdirLength);
                        moduleName = PWD.substring(modulesdirLength, nextSlash >= 0 ? nextSlash : undefined);
                        if ((typeof moduleName === 'string') && (moduleName.trim().length > 0)) {
                            moduleName = moduleName.toLowerCase();
                        } else {
                            moduleName = null;
                        }
                    }
                }
            }

            if (moduleName === null) {
                sprint(clc.red('Missing required argument <module_name>'));
            } else {
                pack(moduleName);
            }
        } else if (args.packall) {
            packModules.forEach(function (module) {
                pack(module);
            });
        } else if (args.mver) {
            let mverModuleName = '';
            if (remain.length >= 2) {
                mverModuleName = remain[1].toLowerCase();
            }
            mver(remain[0], mverModuleName);
        } else if (args.npm) {
            let npmVersion = '';
            if (remain.length >= 1) {
                npmVersion = remain[0].toLowerCase();
            }

            // Ensure we are on root!
            sh.cd(ROOT);
            sh.exec('npm version --no-git-tag-version ' + npmVersion);
        } else if (args.linkmodule) {
            if (remain.length >= 1) {
                linkModule(remain[0].toLowerCase());
            } else {
                sprint(clc.red('Missing required argument <module_name>'));
            }
        } else if (args.unlinkmodule) {
            if (remain.length >= 1) {
                unlinkModule(remain[0].toLowerCase());
            } else {
                sprint(clc.red('Missing required argument <module_name>'));
            }
        } else if (args.icons) {
            icons(INSTALL);
        } else if (args.clearcache) {
            clearcache();
        } else if (args.clearlog) {
            clearlog();
        } else if (args.test) {
            if (remain.length >= 1) {
                PHP_VERSION = remain[0].toLowerCase();
            }
            test(PHP_VERSION);
        } else {
            printHelp();
        }
    }

    /** Exit on Exception */
    process.on('uncaughtException', function () {
        process.exit(1);
    });
};

let install = function () {
    sh.cd(ROOT);

    let bin = sh.exec('echo $PWD', { silent: true }).output.trim() + '/bin/siberian';

    // Copy Siberian CLI custom modification!
    sh.exec('cp -rp ./bin/config/platforms.js ./node_modules/cordova-lib/src/cordova/platform.js');
    sh.exec('cp -rp ./bin/config/platformsConfig.json ./node_modules/cordova-lib/src/platforms/platformsConfig.json');
    sh.exec('cp -rp ./bin/config/plugman.js ./node_modules/cordova-lib/src/plugman/plugman.js');

    // Configuring environment!
    sh.exec('git config core.fileMode false');
    sh.exec('git submodule foreach git config core.fileMode false');

    sprint(clc.blue('When installing be sure to execute these commands from the project directory:'));
    sprint(clc.blue('echo "alias siberian=\'' + bin + '\'" >> ~/.bash_profile && source ~/.bash_profile'));

    sprint('Done.');
};

/**
 * Clean sort & unique language files
 */
let cleanLang = function () {
    sprint(clc.blue('Cleaning duplicates in language files'));

    let languagePath = ROOT + '/siberian/languages/default/';
    fs.readdir(languagePath, function (err, files) {
        files.forEach(function (file) {
            cleanDupesSort(file);
        });
    });

    sprint(clc.green('Clean-up done.'));
};

/**
 * Eport DB Schema to php schemes
 */
let exportDb = function () {
    sh.cd(ROOT + '/siberian');
    sh.exec('php -f cli.php export-db');
};

/**
 * Model, Forms & Controllers boilerplate helper
 */
let moduleTemplate = function () {
    let module = false,
        //type = 'all',
        model = false,
        buildAll = false;

    process.argv.forEach(function (arg) {
        if (arg.indexOf('--module') === 0) {
            module = arg.split('=')[1];
        }

        /** if (arg.indexOf('--type') === 0) {
            type = arg.split('=')[1];
        }*/

        if (arg.indexOf('--model') === 0) {
            model = arg.split('=')[1];
        }

        if (arg.indexOf('--build-all') === 0) {
            buildAll = true;
        }
    });

    if (!module) {
        sprint(clc.red('--module is required.'));
        return;
    }

    if (!buildAll && !model) {
        sprint(clc.red('--model is required whithout --build-all.'));
        return;
    }

    let filteredArgs = process.argv.splice(3).join(' ');
    let scriptPath = ROOT + '/ci/scripts/modules.php"';
    let modulePath = ROOT + '/siberian/app/local/modules/' + module;

    /** Search for module in local */
    if (fs.existsSync(modulePath)) {
        sprint(clc.green('Module found !'));
    } else {
        sprint(clc.blue('Module not found ! Trying to link it'));
        if (linkModule(module.toLowerCase())) {
            sprint(clc.green('Module linked, continuing !'));
        } else {
            sprint(clc.red('Something went wrong while trying to link the module, aborting !'));
            return;
        }
    }

    /** Appends full path to module */
    filteredArgs = filteredArgs + ' --path=' + modulePath;

    sh.exec('php ' + scriptPath + ' ' + filteredArgs);
};

/**
 *
 * @param file
 */
let cleanDupesSort = function (file) {
    try {
        let languagePath = ROOT + '/siberian/languages/default/';

        sprint('File: ' + languagePath + file);

        // Silent for the session
        sh.config.silent = true;
        sh.exec('sort -bdiu -o ' + languagePath + file + ' ' + languagePath + file, { silent: true });
    } catch (e) {
        sprint(clc.red('An error occured while cleaning-up language files: ' + e));
    }
};

/**
 *
 */
let rebuildManifest = function () {
    sprint('Rebuilding app manifest.');
    let developer = require(ROOT + '/developer.json');

    const domain = developer.config.domain;
    const port = ((+(domain.match(/(:([0-9]{1,5}))?$/)[2])) || 80);
    const options = {
        host: domain,
        port: port,
        path: '/backoffice/api_options/manifest',
        headers: {
         'Authorization': 'Basic ' + new Buffer(developer.dummy_email + ':' + developer.dummy_password).toString('base64')
        }
    };
    const failed = (error) => {
        if(typeof error === "object" && error.hasOwnProperty("message")) {
            sprint("Unexpected error: " + clc.red(error.message));
        }
        sprint(clc.red('Catch: Manifest rebuild error, run `siberian init` to set your dummy_email & dummy_password.'));
        notify('Rebuild manifest FAILED.', {sound: "Frog"});
    };

    try {
        http.get(options, (res) => {
            try {
                const { statusCode } = res;
                const contentType = res.headers['content-type'];

                let error;
                if (statusCode !== 200) {
                  error = new Error('Request Failed.\n' +
                                    `Status Code: ${statusCode}`);
                } else if (!/^application\/json/.test(contentType)) {
                  error = new Error('Invalid content-type.\n' +
                                    `Expected application/json but received ${contentType}`);
                }

                if (error) {
//                  res.resume(); // free up memory
//                  throw error;
                }

                res.setEncoding('utf8');
                let rawData = '';
                res.on('data', (chunk) => { rawData += chunk; });
                res.on('end', () => {
                  try {
                      let jsonResult = JSON.parse(rawData);
                      if (jsonResult.success) {
                          sprint(clc.green(jsonResult.message));
                          notify("Rebuild manifest succeeded");
                      } else {
                          throw (new Error(jsonResult.message));
                      }
                  } catch (e) {
                      failed(e);
                  }
                });

            } catch (e) {
                failed(e);
            }
        }).on('error', failed);
    } catch (e) {
        failed(e);
    }
};

/**
 *
 * @param platform
 * @param copy
 * @param prepare
 */
let rebuild = function (platform, copy, prepare) {
    let localPrepare = (prepare === undefined) ? false : prepare;
    let originalIndexContent = null;
    let indexFile = ROOT + '/ionic/www/index.html';

    try {
        originalIndexContent = fs.readFileSync(indexFile, { encoding: 'utf8' });

        let regexp = /\n?\t?\t?<script src="http:\/\/www.siberiancms.dev\/installer\/module\/getfeature\/[^"]+" data-feature="[^"]+"><\/script>\n?\t?/g;
        let indexContent = originalIndexContent.replace(regexp, '');

        if (indexContent === originalIndexContent) {
            originalIndexContent = null; // reset if unused
        } else {
            sprint('Unpatching ionic/www/index.html temporarily....');
            fs.writeFileSync(indexFile, indexContent, { encoding: 'utf8' });
            sprint('Unpatched!');
        }

        // Call gulp to pre-compile/pack js/css files!
        sh.cd(ROOT + '/ionic/');
        sh.exec('gulp sb');
        sh.cd(ROOT);

        if (platform === 'android' ||
            platform === 'android-previewer' ||
            platform === 'ios' ||
            platform === 'ios-noads' ||
            platform === 'ios-previewer' ||
            platform === 'browser') {
            let silent = '--silent';
            if (DEBUG) {
                silent = '';
            }

            let platformPath = ROOT + '/platforms/cdv-siberian-' + platform;
            let installPath = ROOT + '/ionic/platforms/' + platform;

            // Ensure the script is in the good directory Cordova is serious!
            sh.cd(ROOT+'/ionic/');

            if (localPrepare) {
                sprint(clc.blue('Prepping: ') + clc.green(platform + ' ...'));
                sh.exec('cordova '+silent+' prepare '+ platform);
            } else {
                sprint(clc.blue('Rebuilding: ') + clc.green(platform + ' ...'));

                // Delete only if not preparring!
                sh.rm('-rf', ROOT + '/ionic/platforms/' + platform);

                sh.exec('cordova ' + silent + ' platform add ' + platformPath);

                // tmp object for the rebuild all, otherwise this will extends upon each platform!
                let localPlugins = require(ROOT + '/ionic/plugins.json');
                let tmpPlugins = localPlugins.default;
                let platformPlugins = localPlugins[platform];
                let requiredPlugins = Object.assign(platformPlugins, tmpPlugins);

                Object.keys(requiredPlugins).forEach(function (pluginName) {
                    installPlugin(pluginName, platform, requiredPlugins[pluginName]);
                });

                // Before building, copying json platform!
                if (platform === 'ios-noads' || platform === 'ios-previewer' || platform === 'android-previewer') {
                    sh.mv('-f', installPath + '/' +
                        platform.split('-')[0] + '.json', installPath+'/' + platform + '.json');
                }

                switch (platform.split('-')[0]) {
                    case 'android':
                        sh.cp('-f', installPath+'/res/xml/config.xml', installPath+'/config.bck.xml');
                        break;
                    case 'ios':
                        sh.cp('-f', installPath+'/AppsMobileCompany/config.xml', installPath+'/config.bck.xml');
                        break;
                }

                let type = BUILD_TYPE;

                sprint('cordova ' + silent + ' build ' + type + ' ' + platform);
                sh.exec('cordova ' + silent + ' build ' + type + ' ' + platform);
            }

            // Ios specific, run push.rb to patch push notifications!
            if (!prepare) {
                if (platform === 'ios-noads' || platform === 'ios-previewer' || platform === 'ios') {
                    sprint(clc.green('Patching platform project ...'));
                    sh.exec(ROOT + '/ionic/patch/push.rb ' + ROOT + '/ionic/platforms/' + platform + '/');
                }
            }

            // Cleaning up build files!
            if (copy) {
                copyPlatform(platform);

                // Rebuild manifest!
                if (REBUILD_MANIFEST) {
                    rebuildManifest();
                }
            }

            sprint(clc.green('Done.'));
        } else {
            throw new Error('Unknown platform ' + platform);
        }
    } catch (e) {
        throw e; // Dont mess with me!
    } finally { // Yes I checked, finally are executed even if exception is re-thrown!
        if (originalIndexContent !== null) {
            sprint('Repatching ionic/www/index.html....');
            fs.writeFileSync(indexFile, originalIndexContent, { encoding: 'utf8' });
            sprint('Repatched!');
            originalIndexContent = null;
        }
    }
};

/**
 *
 * @param pluginName
 * @param platform
 * @param opts
 */
let installPlugin = function (pluginName, platform, opts) {
    let platformBase = platform.split('-')[0],
        platformPath = ROOT + '/ionic/platforms/' + platform,
        pluginPath = ROOT + '/plugins/' + pluginName,
        pluginVariables = opts.variables || '';

    // Read plugin platforms!
    let pluginConfigPath = ROOT + '/plugins/' + pluginName + '/package.json';
    let pluginConfig = false;
    if (fs.existsSync(pluginConfigPath)) {
        pluginConfig = require(pluginConfigPath);
    }

    // Skip plugin (from default) if not targeted by the package.json!
    let skipPlugin = true;
    if (pluginConfig !== false) {
        Object.keys(pluginConfig.cordova.platforms).forEach(function (objectPlatform) {
            if (platformBase === pluginConfig.cordova.platforms[objectPlatform]) {
                skipPlugin = false;
            }
        });
    }

    if (skipPlugin) {
        sprint(clc.black('Skipping: ' + pluginName + '...'));
    } else {
        sprint(clc.blue('Installing: ') + clc.red(pluginName + '...'));

        let cliVariables = '';
        Object.keys(pluginVariables).forEach(function (variable) {
            let key = variable;
            let value = pluginVariables[variable];

            cliVariables = cliVariables + ' --variable ' + key + '=' + value;
        });

        let silent = '--silent';
        if (DEBUG) {
            silent = '';
        }

        sh.exec('plugman install --platform ' + platformBase +
            ' --project ' + platformPath + ' ' + silent + ' --plugin ' + pluginPath + ' ' + cliVariables);
    }
};

/**
 * Alias to build icons, some external packages are required to build however
 * see specific platform documentation about building icons.
 */
let icons = function (INSTALL) {
    if (INSTALL) {
        if (process.platform === "darwin") {
            sh.exec('brew install fontforge ttfautohint');
            sh.exec('sudo gem install sass');
        }

        // @todo, linux & windows deps
    }

    sh.exec('chmod +x ' + ROOT + '/resources/ionicons/builder/scripts/sfnt2woff');
    sh.exec('python ' + ROOT + '/resources/ionicons/builder/generate.py');

    sh.cp('-rf', ROOT + '/resources/ionicons/fonts',
        ROOT + '/siberian/app/sae/design/desktop/flat/css/webfonts/ionicons/');
    sh.cp('-rf', ROOT + '/resources/ionicons/css',
        ROOT + '/siberian/app/sae/design/desktop/flat/css/webfonts/ionicons/');
};

/**
 *
 * @param platform
 */
let copyPlatform = function (platform) {
    sprint('Copying ' + platform + ' ...');

    let ionicPlatformPath = ROOT + '/ionic/platforms/' + platform,
        siberianPlatformPath = ROOT + '/siberian/var/apps/ionic/' + platform,
        wwwPreviewerPlatformPath = ROOT + '/siberian/var/apps/ionic/previewer/' + platform.split('-')[0];

    switch (platform) {
        case 'android':
            sh.rm('-rf', ionicPlatformPath + '/build');
            sh.rm('-rf', ionicPlatformPath + '/CordovaLib/build');
            sh.rm('-rf', ionicPlatformPath + '/cordova/plugins');
            sh.rm('-rf', ionicPlatformPath + '/assets/www/modules/*');

            // Clean-up!
            sh.rm('-rf', siberianPlatformPath);

            // Copy!
            sh.cp('-r', ionicPlatformPath + '/', siberianPlatformPath);
            sh.rm('-rf', siberianPlatformPath + '/platform_www');
            cleanupWww(siberianPlatformPath + '/assets/www/');

            break;

        case 'browser':
            // Different path for Browser!
            siberianPlatformPath = siberianPlatformPath.replace('ionic/', '');
            ionicPlatformPath = ionicPlatformPath + '/www';
            sh.rm('-rf', ionicPlatformPath + '/modules/*');

            // Clean-up!
            sh.rm('-rf', siberianPlatformPath);
            sh.rm('-rf', siberianPlatformPath.replace('browser', 'overview'));

            // Copy!
            sh.cp('-r', ionicPlatformPath + '/', siberianPlatformPath);
            sh.cp('-r', ROOT + '/ionic/scss/ionic.siberian*scss', siberianPlatformPath + '/scss/');

            // Duplicate in 'overview'!
            sh.cp('-r', siberianPlatformPath + '/*', siberianPlatformPath.replace('browser', 'overview'));

            break;

        case 'ios': case 'ios-noads':
        sh.rm('-rf', ionicPlatformPath + '/build');
        sh.rm('-rf', ionicPlatformPath + '/CordovaLib/build');
        sh.rm('-rf', ionicPlatformPath + '/cordova/plugins');
        sh.rm('-rf', ionicPlatformPath + '/www/modules/*');

        // Clean-up!
        sh.rm('-rf', siberianPlatformPath);

        // Copy!
        sh.cp('-r', ionicPlatformPath + '/', siberianPlatformPath);
        sh.rm('-rf', siberianPlatformPath + '/platform_www');
        cleanupWww(siberianPlatformPath + '/www/');

        break;

        case 'android-previewer':
            sh.rm('-rf', ionicPlatformPath + '/build');
            sh.rm('-rf', ionicPlatformPath + '/CordovaLib/build');
            sh.rm('-rf', ionicPlatformPath + '/cordova/plugins');
            sh.rm('-rf', ionicPlatformPath + '/assets/www/modules/*');

            // Clean-up!
            sh.rm('-rf', wwwPreviewerPlatformPath);

            // Copy to local !
            sh.rm('-rf', wwwPreviewerPlatformPath + '/');
            sh.cp('-rf', ionicPlatformPath + '/', wwwPreviewerPlatformPath + '/');
            sh.rm('-rf', wwwPreviewerPlatformPath + '/platform_www');
            cleanupWww(wwwPreviewerPlatformPath + '/assets/www/');

            break;

        case 'ios-previewer':
            sh.rm('-rf', ionicPlatformPath + '/build');
            sh.rm('-rf', ionicPlatformPath + '/CordovaLib/build');
            sh.rm('-rf', ionicPlatformPath + '/cordova/plugins');
            sh.rm('-rf', ionicPlatformPath + '/www/modules/*');

            // Clean-up!
            sh.rm('-rf', wwwPreviewerPlatformPath);

            // Copy to local !
            sh.rm('-rf', wwwPreviewerPlatformPath + '/');
            sh.cp('-rf', ionicPlatformPath + '/', wwwPreviewerPlatformPath + '/');
            sh.rm('-rf', wwwPreviewerPlatformPath + '/platform_www');
            cleanupWww(wwwPreviewerPlatformPath + '/www/');

            break;
    }

    sprint('Copy done');
};

let cleanupWww = function (basePath) {
    let filesToRemove = [
        'img/ionic.png',
        'lib/ionic/scss',
        'css/ionic.app.css',
        'lib/ionic/css/ionic.css',
        'lib/ionic/js/ionic.js',
        'lib/ionic/js/ionic.bundle.js',
        'lib/ionic/js/ionic-angular.js',
        'lib/ionic/js/angular/angular.js',
        'lib/ionic/js/angular/angular-animate.js',
        'lib/ionic/js/angular/angular-resource.js',
        'lib/ionic/js/angular/angular-sanitize.js',
        'lib/ionic/js/angular-ui/angular-ui-router.js'
    ];

    Object.keys(filesToRemove).forEach(function (key) {
        let localPath = filesToRemove[key];

        sh.rm('-rf', basePath + localPath);
    });
};

/**
 *
 */
let test = function () {
    sprint(clc.green('Running PHP syntax test, for version: ' + PHP_VERSION + ''));

    sh.exec('find ' + ROOT + '/siberian/app -name \'*.php\' -exec ' +
        PHP_VERSION + ' -l {} \\; | grep -v \'No syntax errors detected\'');
    sh.exec('find ' + ROOT + '/siberian/lib/Siberian -name \'*.php\' -exec ' +
        PHP_VERSION + ' -l {} \\; | grep -v \'No syntax errors detected\'');

    sprint(clc.green('Test done.'));
};

/**
 *
 */
let ionicServe = function () {
    sprint(clc.blue('Starting ionic server in background screen, use \'screen -r ions\' ' +
        'to attach & \'ctrl+a then d\' to detach ...'));

    /** Ensure the script is in the good directory Cordova is serious ... */
    sh.cd(ROOT+'/ionic/');
    sh.exec('if screen -ls ions | grep -q .ions; then echo \'Already running\'; ' +
        'else screen -dmS ions ionic serve -a; fi');
};

/** Sync git submodules */
let syncModule = function (external) {
    sh.cd(ROOT);

    let submodules = require(ROOT + '/submodules.json'),
        localPlugins = submodules.plugins,
        localPlatforms = submodules.platforms;

    Object.keys(localPlugins).forEach(function (key) {
        let plugin = localPlugins[key];
        let gitUrl = plugin.git;
        let gitBranch = plugin.branch;

        createOrSyncGit(ROOT + '/plugins/' + key, gitUrl, gitBranch);
    });

    Object.keys(localPlatforms).forEach(function (key) {
        let platform = localPlatforms[key];
        let gitUrl = platform.git;
        let gitBranch = platform.branch;

        createOrSyncGit(ROOT + '/platforms/' + key, gitUrl, gitBranch);
    });
};

/**
 *
 * @param gitPath
 * @param url
 * @param branch
 */
let createOrSyncGit = function (gitPath, url, branch) {
    sprint(clc.blue('Git sync: ') + clc.red(url + '@' + branch));
    if (fs.existsSync(gitPath)) {
        sh.cd(gitPath);
        sh.exec('git fetch', { silent: true });
        let status = sh.exec('git status', { silent: true }).output.trim();
        if (status.indexOf('branch is up-to-date') === -1) {
            sh.exec('git checkout ' + branch + '; git pull origin ' + branch);
        } else {
            sh.exec(' git config core.fileMode false; git status');
        }
    } else {
        sh.exec('git clone -b ' + branch + ' ' + url + ' ' + gitPath);
    }

    let revision = sh.exec('git rev-parse HEAD^0', { silent: true }).output.trim();
    sprint('Up-to-date (' + revision + ')');
};

/**
 * Switching from sae/mae/pe
 *
 * @param type
 * @param reinstall
 * @param emptydb
 */
let switchType = function (type, reinstall, emptydb) {
    let versionTplPath = ROOT + '/bin/templates/Version.php',
        versionPath = ROOT + '/siberian/lib/Siberian/Version.php',
        iniPath = ROOT + '/siberian/app/configs/app.ini',
        developer = require(ROOT + '/developer.json'),
        tmpPath = '/tmp/sbtype';

    if (type === '' || type === 'minimal') {
        let currentVersion = fs.readFileSync(versionPath, 'utf8');
        let currentEdition = currentVersion.match(/const TYPE = '([a-z])+';/gi);
        currentEdition = currentEdition[0].replace(/(const TYPE = '|';)/g, '');

        if (type === 'minimal') {
            sprint(currentEdition);
        } else {
            sprint(clc.red('You are currently working on: ') + clc.blue(currentEdition));
        }

        return;
    }

    if ((type !== 'pe') && (type !== 'mae') && (type !== 'sae')) {
        sprint(clc.red('Error: bad type \'' + type + '\''));
        return;
    }

    let version = fs.readFileSync(versionTplPath, 'utf8');
    version = version
        .replace('%TYPE%', type.toUpperCase())
        .replace('%NAME%', 'Development')
        .replace('%VERSION%', siberian.version)
        .replace('%NATIVE_VERSION%', siberian.nativeVersion);

    fs.writeFileSync(versionPath, version, 'utf8');

    if (!fs.existsSync(iniPath)) {
        // Copying app.sample.ini to app.ini if not initialized!
        sh.cp(iniPath.replace('app.ini', 'app.sample.ini'), iniPath);
    }

    let appIni = fs.readFileSync(iniPath, 'utf8');
    appIni = appIni.replace(/dbname = '(.*)'/, 'dbname = "' +
        developer.mysql.database_prefix+type.toLowerCase() + '"');

    // Reset the isInstalled var.!
    if (reinstall) {
        appIni = appIni.replace(/isInstalled = '(.*)'/, 'isInstalled = "0"');
    }

    // Empty database!
    if (emptydb) {
        let mysqlUsername = developer.mysql.username;
        let mysqlPassword = developer.mysql.password;
        let mysqlDatabasePrefix = developer.mysql.database_prefix;

        sh.exec('mysql -u ' + mysqlUsername +
            ' -p' + mysqlPassword +
            ' -e \'DROP DATABASE ' + mysqlDatabasePrefix + type.toLowerCase() + '; ' +
            'CREATE DATABASE ' + mysqlDatabasePrefix + type.toLowerCase() + ';\'');
    }

    fs.writeFileSync(iniPath, appIni, 'utf8');
    fs.writeFileSync(tmpPath, type.toLowerCase() + ' ', 'utf8');

    // Clearing out css cache (avoiding same app id across editions to not rebuild css & load bad colors)!
    clearcache();

    sprint(clc.red('You are now working on: ') + clc.blue(type.toUpperCase()));
};

/**
 * Switch environment to development
 */
let setDev = function () {
    sprint(clc.red('Switched environment to development'));
    sh.rm('-f', ROOT + '/siberian/config.php');
    sh.cp(ROOT + '/bin/templates/config_dev.php', ROOT + '/siberian/config.php');
};

/**
 * Switch environment to production
 */
let setProd = function () {
    sprint(clc.blue('Switched environment to production'));
    sh.rm('-f', ROOT + '/siberian/config.php');
    sh.cp(ROOT + '/bin/templates/config_prod.php', ROOT + '/siberian/config.php');
};

/**
 * Clear application cache
 */
let clearcache = function () {
    let cachePath = ROOT + '/siberian/var/cache/*';

    sh.rm('-rf', cachePath);

    sprint(clc.blue('Cache has been cleared.'));
};

/**
 * Clear application logs
 */
let clearlog = function () {
    let logPath = ROOT+'/siberian/var/log/*';

    sh.rm('-rf', logPath);

    sprint(clc.blue('Logs have been cleared.'));
};

/**
 * Fills the developer.json local configuration for developments
 */
let init = function () {
    sprint(clc.bold(clc.green('\n\nPlease fill the required informations to process the ' +
        'SiberianCMS initialization: ')));

    let developerPath = ROOT + '/developer.json',
        serverType = 'apache',
        domain = 'www.siberiancms.dev';

    if (fs.existsSync(developerPath)) {
        sprint(clc.bold(clc.red('Warning: you are about to erase your local developer.json file. ' +
            'Ctrl-C to exit.')));
    }

    // Default dummy values!
    let developer = {
        name: 'Siberian Admin',
        email: 'developer@localhost',
        dummyEmail: 'developer@localhost',
        dummyPassword: 'dummy',
        config: {
            domain: 'siberiancms.local',
            serverType: 'apache'
        },
        mysql: {
            host: 'localhost',
            username: 'dumb',
            password: 'dumber',
            databasePrefix: 'siberiancms_'
        }
    };

    if (fs.existsSync(developerPath)) {
        let localDev = require(developerPath);
        // Use local developer.json as default values if existing!
        developer = Object.assign(developer, localDev);
    }

    // Really annoying!
    prompt('Name', developer.name, function (name) {
        prompt('E-mail', developer.email, function (email) {
            prompt('Dummy email for app login', developer.dummyEmail, function (dummyEmail) {
                prompt('Dummy password for app login', developer.dummyPassword, function (dummyPassword) {
                    prompt('Domain', developer.config.domain, function (configDomain) {
                        prompt('Server type nginx|apache', developer.config.server_type, function (configServerType) {
                            prompt('Mysql Hostname', developer.mysql.host, function (mysqlHost) {
                                prompt('Mysql Username', developer.mysql.username, function (mysqlUsername) {
                                    prompt('Mysql Password', developer.mysql.password, function (mysqlPassword) {
                                        prompt('Mysql Database prefix', developer.mysql.database_prefix, function (mysqlDatabasePrefix) {

                                            let newDeveloper = {
                                                name: name,
                                                email: email,
                                                dummyEmail: dummyEmail,
                                                dummyPassword: dummyPassword,
                                                config: {
                                                    domain: configDomain,
                                                    serverType: configServerType
                                                },
                                                mysql: {
                                                    host: mysqlHost,
                                                    username: mysqlUsername,
                                                    password: mysqlPassword,
                                                    databasePrefix: mysqlDatabasePrefix
                                                }
                                            };

                                            serverType = configServerType;
                                            domain = configDomain;

                                            fs.writeFileSync(developerPath, JSON.stringify(newDeveloper), 'utf8');

                                            sh.rm('-f', ROOT + '/apache.default');
                                            sh.rm('-f', ROOT + '/nginx.default');

                                            let serverConfigPath = ROOT + '/bin/templates/' + serverType + '.default';
                                            let serverConfigLocalPath = ROOT + '/' + serverType + '.default';

                                            let serverConfig = fs.readFileSync(serverConfigPath, 'utf8');
                                            serverConfig = serverConfig
                                                .replace(/%PATH%/gm, ROOT)
                                                .replace(/%DOMAIN%/gm, domain)
                                            ;
                                            fs.writeFileSync(serverConfigLocalPath, serverConfig, 'utf8');

                                            sh.exec('mysql -u ' + mysqlUsername +
                                                ' -p' + mysqlPassword +
                                                ' -e \'CREATE DATABASE IF NOT EXISTS ' +
                                                mysqlDatabasePrefix + 'sae; ' +
                                                'CREATE DATABASE IF NOT EXISTS ' +
                                                mysqlDatabasePrefix + 'mae; ' +
                                                'CREATE DATABASE IF NOT EXISTS ' +
                                                mysqlDatabasePrefix + 'pe;\'');

                                            // Asking for git config sync!
                                            prompt('Would you like to update your local ' +
                                                'git config with user.name & user.email (Y/n) ?', 'n',
                                                function (answerGit) {
                                                    if (answerGit === 'Y') {
                                                        sh.exec('git config --unset-all user.name');
                                                        sh.exec('git config user.name "' + name + '"');
                                                        sh.exec('git config --unset-all user.email');
                                                        sh.exec('git config user.email "' + email + '"');
                                                    }

                                                    sprint(clc.green('\nThank you, your developer.json file is ready'));
                                                    sprint(clc.green('\nYou can find your ' +
                                                        serverType + ' configuration file here: ' +
                                                        ROOT + '/' + serverType + '.default'));

                                                    process.exit();
                                                });
                                        });
                                    });
                                });
                            });
                        });
                    });
                });
            });
        });
    });
};

/**
 * Check and/or init all three dbs
 */
let checkDb = function () {
    let developerPath = ROOT + '/developer.json';
    if (fs.existsSync(developerPath)) {
        let localDev = require(developerPath);
        let mysql = localDev.mysql;

        sh.exec('mysql -u ' + mysql.username +
            ' -p' + mysql.password +
            ' -e \'CREATE DATABASE IF NOT EXISTS ' + mysql.databasePrefix + 'sae; ' +
            'CREATE DATABASE IF NOT EXISTS ' + mysql.databasePrefix + 'mae; ' +
            'CREATE DATABASE IF NOT EXISTS ' + mysql.databasePrefix + 'pe;\'');
    } else {
        init();
    }
};

/**
 *
 * @param modulePath
 * @returns {Array}
 */
let getFeatures = function (modulePath) {
    let finalFeatures = [];
    let featuresDir = modulePath + '/resources/features';
    if (fs.existsSync(featuresDir)) {
        let features = fs.readdirSync(featuresDir).map(function (f) {
            return path.join(featuresDir, f);
        }).filter(function (f) {
            return fs.statSync(f).isDirectory();
        });

        features.forEach(function (featureDir) {
            let featJsonPath = path.join(featuresDir, 'feature.json');
            if (fs.existsSync(featJsonPath)) {
                let featJson = require(featJsonPath);
                if ((typeof featJson === 'object') && (featJson !== null)) {
                    featJson.__DIR__ = featureDir;
                    featJson.__FILE__ = featJsonPath;
                    if (Array.isArray(featJson.files)) {
                        let invalid = false;
                        ['name', 'code', 'model', 'desktop_uri', 'routes', 'icons'].forEach(function (k) {
                            if (!featJson.hasOwnProperty(k)) {
                                invalid = false;
                            }
                        });

                        if (!invalid) {
                            invalid = featJson.routes.reduce(function (carry, el) {
                                return (el.root === true);
                            }, false);
                            if (!invalid) {
                                finalFeatures.push(featJson);
                            }
                        }
                    }
                }
            }
        });
    }

    return finalFeatures;
};

/**
 * Links an external module for dev purposes
 *
 * @param module
 * @returns {boolean}
 */
let linkModule = function (module) {
    // ModulePath Siberian!
    let modFolder = 'modules',
        modulePath = ROOT + '/' + modFolder + '/' + module;

    if (!fs.existsSync(ROOT + '/modules/' + module + '/package.json')) {
        sprint(clc.red('Module \'' + module + '\' has no package.json.'));

        // Search in external modules!
        modFolder = 'ext-modules';
        modulePath = ROOT + '/' + modFolder + '/' + module;
        if (!fs.existsSync(ROOT + '/' + modFolder + '/' + module + '/package.json')) {
            sprint(clc.red('External module \'' + module + '\' has no package.json.'));

            return false;
        }
    }

    let modulePackage = require(ROOT + '/' + modFolder + '/' + module + '/package.json'),
        moduleLinkName = modulePackage.name,
        moduleLinkPath = ROOT + '/siberian/app/local/modules/' + moduleLinkName,
        moduleLinkPathShort = 'app/local/modules/' + moduleLinkName;

    if (!fs.existsSync(modulePath)) {
        sprint(clc.red('Module \'' + module + '\' doesn\'t exists.'));
        return false;
    }

    if (fs.existsSync(moduleLinkPath)) {
        sprint(clc.blue('Module \'' + module + '\' is already linked.'));
        return true;
    }

    if (fs.existsSync(modulePath) && !fs.existsSync(moduleLinkPath)) {
        sh.ln('-s', modulePath, moduleLinkPath);

        if (isObject(modulePackage.assets) && modulePackage.assets.path) {
            let assetsPath = modulePath + '/' + modulePackage.assets.path,
                ionicAssetsPath = ROOT + '/ionic/www/modules/' + modulePackage.assets.folder,
                ionicAssetsPathShort = 'ionic/www/modules/' + modulePackage.assets.folder;

            sh.ln('-s', assetsPath, ionicAssetsPath);

            sprint('Linked ' + module + ' to ' +
                clc.green(moduleLinkPathShort) + ' & ' + clc.green(ionicAssetsPathShort));
        } else {
            sprint('Linked ' + module + ' to ' + clc.green(moduleLinkPathShort));
        }

        // Look for features!
        sprint('');
        sprint('Looking for features... ');
        let features = getFeatures(modulePath);
        features.forEach(function (featJson) {
            sprint('===');
            sprint('Found ' + featJson.name + ' feature. Linking.');
            sprint('===');

            let featureDir = featJson.__DIR__,
                ionicFeaturesDir = ROOT + '/ionic/www/features',
                featureDestDir = ionicFeaturesDir + '/' + path.basename(featureDir);

            if (!fs.existsSync(ionicFeaturesDir)) {
                fs.mkdirSync(ionicFeaturesDir);
            }

            sh.ln('-s', featureDir, featureDestDir);

            sprint('Linked to ' + featureDestDir.replace(ROOT+'/', ''));
            sprint('Patching ionic/www/index.html');

            let indexFile = ROOT + '/ionic/www/index.html',
                indexContent = fs.readFileSync(indexFile, { encoding: 'utf8' });

            indexContent = indexContent.replace('</head>',
                '\n\t\t<script src=\'http://www.siberiancms.dev/installer/module/getfeature/mod/' +
                modulePackage.name + '/feat/' +
                featJson.code + '\' data-feature=\'' + featJson.code + '\'></script>\n\t</head>');

            fs.writeFileSync(indexFile, indexContent, { encoding: 'utf8' });

            sprint('Patched!');
            sprint('===');
        });
        if (features.length > 0) {
            rebuildManifest();
        }
    } else {
        sprint(clc.red('Something went wront, please check if the module exists, or unlink it before.'));
        return false;
    }

    return true;
};

/**
 * Unlink an external module for dev purposes
 *
 * @param module
 * @returns {boolean}
 */
let unlinkModule = function (module) {
    let modFolder = 'modules';
    let modulePath = ROOT + '/' + modFolder + '/' + module;

    if (!fs.existsSync(ROOT + '/' + modFolder + '/' + module + '/package.json')) {
        sprint(clc.red('Module \'' + module + '\' has no package.json.'));

        // Search in external modules!
        modFolder = 'ext-modules';
        modulePath = ROOT + '/' + modFolder + '/' + module;
        if (!fs.existsSync(ROOT + '/' + modFolder + '/' + module + '/package.json')) {
            sprint(clc.red('External module \'' + module + '\' has no package.json.'));

            return false;
        }
    }

    let modulePackage = require(ROOT + '/' + modFolder + '/' + module + '/package.json'),
        moduleLinkName = modulePackage.name,
        moduleLinkPath = ROOT + '/siberian/app/local/modules/'+moduleLinkName,
        moduleLinkPathShort = 'app/local/modules/'+moduleLinkName,
        ionicAssetsPath = isObject(modulePackage.assets) ?
        ROOT + '/ionic/www/modules/'+modulePackage.assets.folder : null,
        ionicAssetsPathShort = isObject(modulePackage.assets) ?
        'ionic/www/modules/' + modulePackage.assets.folder : null;

    if (!fs.existsSync(modulePath)) {
        sprint(clc.red('Module \'' + module + '\' doesn\'t exists.'));
        return false;
    }

    if (fs.existsSync(modulePath) && fs.existsSync(moduleLinkPath)) {
        sh.rm('-f', moduleLinkPath);
        let unliked = 'Unlinked ' + module + ' from ' + clc.green(moduleLinkPathShort);

        if (ionicAssetsPath && fs.existsSync(ionicAssetsPath)) {
            sh.rm('-f', ionicAssetsPath);
            unliked = unliked + ' & ' + clc.green(ionicAssetsPathShort);
        }

        sprint(unliked);
        sprint('');
        sprint('Looking for features... ');

        let features = getFeatures(modulePath);
        features.forEach(function (featJson) {
            sprint('===');
            sprint('Found ' + featJson.name + ' feature. Unlinking.');
            sprint('===');

            let featureDir = featJson.__DIR__,
                ionicFeaturesDir = ROOT + '/ionic/www/features',
                featureDestDir = ionicFeaturesDir + '/' + path.basename(featureDir);

            if (!fs.existsSync(ionicFeaturesDir)) {
                fs.mkdirSync(ionicFeaturesDir);
            }

            sh.rm('-f', featureDestDir);

            sprint('Unlinked '+featureDestDir.replace(ROOT+'/', ''));
            sprint('Unpatching ionic/www/index.html');

            let indexFile = ROOT + '/ionic/www/index.html',
                indexContent = fs.readFileSync(indexFile, { encoding: 'utf8' });

            indexContent = indexContent.replace(
                new RegExp(
                    '\n?\t*<script[^<]+data-feature=\'' + featJson.code + '\'></script>\n?\t*',
                    'g'
                ),
                ''
            ).replace(
                new RegExp(
                    '\n?\t*<link[^<]+data-feature=\'' + featJson.code + '\'>\n?\t*',
                    'g'
                ),
                ''
            );

            fs.writeFileSync(indexFile, indexContent, { encoding: 'utf8' });

            sprint('Unpatched!');
            sprint('===');
        });
        if (features.length > 0) {
            rebuildManifest();
        }
    } else {
        sprint('Nothing to do.');
    }

    return true;
};

/**
 * Packing any module to installable zip archive
 *
 * @param module
 */
let pack = function (module) {
    let zipExclude = '--exclude=*.DS_Store* --exclude=*.idea* --exclude=*.git*',
        modulePath = ROOT + '/modules/' + module;

    if (!fs.existsSync(modulePath)) {
        sprint(clc.red('Module `' + module + '` doesn\'t exists.'));
        return;
    }

    let modulePackage = require(modulePath+'/package.json'),
        version = modulePackage.version,
        buildPath = ROOT + '/packages/modules/',
        zipName = module + '-' + version + '.zip';

    sprint(clc.blue('Building ' + module + ' version: ' + version));

    // Zip the Module!
    sh.cd(modulePath);
    sh.rm('-f', buildPath + zipName);
    sh.exec('zip -r -9 ' + zipExclude + ' ' + buildPath + zipName + ' ./');

    sprint(clc.green('Package done. ' + buildPath + zipName));
};

/**
 * Changes a module versionb in database, for update purpose
 *
 * @param version
 * @param module
 */
let mver = function (version, module) {
    let versionPath = ROOT + '/siberian/lib/Siberian/Version.php',
        developer = require(ROOT + '/developer.json'),
        currentVersion = fs.readFileSync(versionPath, 'utf8'),
        currentEdition = currentVersion.match(/const TYPE = '([a-z])+';/gi),
        mysqlUsername = developer.mysql.username,
        mysqlPassword = developer.mysql.password,
        mysqlDatabasePrefix = developer.mysql.database_prefix,
        query = 'UPDATE `module` SET `version` = \'' + version + '\' ';

    currentEdition = currentEdition[0].replace(/(const TYPE = '|';)/g, '').toLowerCase();

    if (module.trim() !== '') {
        query = query + ' WHERE `name` LIKE \'%' + module.trim() + '%\'';
    }

    sh.exec('mysql -u ' + mysqlUsername +
        ' -p' + mysqlPassword + ' ' + mysqlDatabasePrefix + currentEdition + ' -e \'' + query + ';\'');
};

/**
 * Helper for common aliases
 */
let aliasHelp = function () {
    sprint('alias sb=\'siberian\'');
    sprint('alias sbr=\'siberian rebuild\'');
    sprint('alias sbi=\'siberian ions\'');
    sprint('alias sbt=\'siberian type\'');
    sprint('alias sbsm=\'siberian sync-module\'');
    sprint('alias sbp=\'siberian prod\'');
    sprint('alias sbd=\'siberian dev\'');
    sprint('alias sbcc=\'siberian clearcache\'');
    sprint('alias sbcl=\'siberian clearlog\'');
    sprint('alias sbm=\'siberian mver\'');
    sprint('alias sblm=\'siberian lm\'');
    sprint('alias sbulm=\'siberian ulm\'');
};

/**
 * CLI Helper
 */
let printHelp = function () {
    sprint(clc.blue('###############################################'));
    sprint(clc.blue('#                                             #'));
    sprint(clc.blue('#     ' + clc.bold('SiberianCMS command-line interface.') + '     #'));
    sprint(clc.blue('#                                             #'));
    sprint(clc.blue('###############################################'));
    sprint('');
    sprint(clc.blue('Available commands are: '));
    sprint('');
    let help = `
alias                   Prints bash aliases to help development

clearcache, cc          Clear siberian/var/cache

clearlog, cl            Clear siberian/var/log

cleanlang               Clean-up duplicates & sort languages CSV files

db                      Check if databases exists, otherwise create them

export-db               Export db tables to schema files

init                    Initializes DB, project, settings.

install                 Install forks for cordova-lib.

icons                   Build ionicons font
                            - install: install required dependencies (OSX Only).
        icons [install]

ions                    Start ionic serve in background

rebuild                 Rebuild a platform:
                            - debug: option will show more informations.
                            - copy: copy platform to siberian/var/apps.
                            - no-manifest: don't call the rebuild manifest hook.
        rebuild <platform> [copy] [debug] [no-manifest]

rebuild-all             Rebuild all platforms

syncmodule, sm          Resync a module in the Application

type                    Switch the Application type 'sae|mae|pe' or print the current if blank
                        note: clearcache is called when changing type.
                            - reset: optional, will set is_installed to 0.
                            - empty: optional, clear all the database.
        type [type] [reset] [empty]
test                    Test PHP syntax

pack                    Pack a module into zip, file is located in ./packages/modules/
                            - If using from a module forlders module_name is optional
        pack <module_name>

packall                 Pack all referenced modules

prepare                 Prepare a platform:
                            - debug: option will show more informations.
                            - copy: copy platform to siberian/var/apps.
                            - no-manifest: don't call the rebuild manifest hook.
        prepare <platform> [copy] [debug] [no-manifest]

manifest                Rebuilds app manifest

mver                    Update all module version to <version> or only the specified one, in database.
                            - module_name is case-insensitive and is searched with LIKE %module_name%
                            - module_name is optional and if empty all modules versions are changed
        mver <version> [module_name]

npm                     Hook for npm version.
    npm <version>

prod                    Switch the Application mode to 'production'.

dev                     Switch the Application mode to 'development'.

version                 Prints the current SiberianCMS version.

linkmodule, lm          Symlink a module from ./modules/ to ./siberian/app/local/modules/
        lm <module>

unlinkmodule, ulm       Remove module symlink
        ulm <module>

syncmodule, sm          Sync all sub-modules/platforms/plugins from git
`;

    sprint(help);
};

module.exports = cli;
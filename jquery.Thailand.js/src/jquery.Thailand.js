/**
 * @name jquery.Thailand.js
 * @version 1.5.3.5
 * @update May 31, 2018
 * @website https://github.com/earthchie/jquery.Thailand.js
 * @license WTFPL v.2 - http://www.wtfpl.net/
 *
 * @dependencies: jQuery <https://jquery.com/>
 *              zip.js <https://github.com/gildas-lormeau/zip.js> (optional: for zip database_type only)
 *              typeahead.js <https://twitter.github.io/typeahead.js/>
 *              JQL.js <https://github.com/earthchie/JQL.js>
 **/

$.Thailand = function (options) {
    'use strict';

    options = $.extend({}, $.Thailand.defaults, options);

    var preprocess = function (data) {
        var result = [];
        for (var province in data) {
            if (data.hasOwnProperty(province)) {
                var province_name = province.split('|')[0], province_code = province.split('|')[1] || false;
                for (var amphoe in data[province]) {
                    if (data[province].hasOwnProperty(amphoe)) {
                        var amphoe_name = amphoe.split('|')[0], amphoe_code = amphoe.split('|')[1] || false;
                        for (var district in data[province][amphoe]) {
                            if (data[province][amphoe].hasOwnProperty(district)) {
                                var district_name = district.split('|')[0], district_code = district.split('|')[1] || false;
                                for (var i in data[province][amphoe][district]) {
                                    if (data[province][amphoe][district].hasOwnProperty(i)) {
                                        result.push({
                                            district: district_name,
                                            district_code: district_code,
                                            amphoe: amphoe_name,
                                            amphoe_code: amphoe_code,
                                            province: province_name,
                                            province_code: province_code,
                                            zipcode: data[province][amphoe][district][i],
                                        });
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }
        return result;
    },
    similar_text = function (first, second, percentage) {
        // compare 2 strings, return value of similarity compare to each other. more value = more similarity
        first += '';
        second += '';

        var pos1 = 0,
            pos2 = 0,
            max = 0,
            firstLength = first.length,
            secondLength = second.length,
            p,
            q,
            l,
            sum;

        for (p = 0; p < firstLength; p = p + 1) {
            for (q = 0; q < secondLength; q = q + 1) {
                l = 0;
                while ((p + l < firstLength) && (q + l < secondLength) && (first.charAt(p + l) === second.charAt(q + l))) {
                    l = l + 1;
                }
                if (l > max) {
                    max = l;
                    pos1 = p;
                    pos2 = q;
                }
            }
        }

        sum = max;

        if (sum) {
            if (pos1 && pos2) {
                sum += similar_text(first.substr(0, pos2), second.substr(0, pos2), false);
            }

            if ((pos1 + max < firstLength) && (pos2 + max < secondLength)) {
                sum += similar_text(first.substr(pos1 + max, firstLength - pos1 - max), second.substr(pos2 + max, secondLength - pos2 - max), false);
            }
        }

        if (percentage === false) {
            return sum;
        } else {
            if (first === second) {
                return 100;
            } else {
                if (firstLength > secondLength) {
                    return Math.floor(sum / firstLength * 100);
                } else {
                    return Math.floor(sum / secondLength * 100);
                }
            }
        }
    },
    loadDB = function (callback) {
        var type = options.database_type.toLowerCase(),
            xhr;

        if (type !== 'json' && type !== 'zip') {
            type = options.database.split('.').pop(); // attempt to figure from file extension instead
        }

        switch (type) {

        case 'json':

            $.getJSON(options.database, function (json) {
                callback(new JQL(preprocess(json)));
            }).fail(function (err) {
                throw new Error('File "' + options.database + '" is not exists.');
            });
            break;

        case 'zip':

            if (!options.zip_worker_path) {
                $('script').each(function () {
                    var fragments = this.src.split('/'),
                        filename = fragments.pop();
                    if (filename === 'zip.js') {
                        zip.workerScriptsPath = fragments.join('/') + '/';
                    }
                });
            }

            xhr = new XMLHttpRequest();
            xhr.responseType = 'blob';

            xhr.onreadystatechange = function () {
                if (xhr.readyState === 4) {
                    if (xhr.status === 200) {
                        zip.createReader(new zip.BlobReader(xhr.response), function (zipReader) {
                            zipReader.getEntries(function (r) {
                                r[0].getData(new zip.BlobWriter(), function (blob) {
                                    var reader = new FileReader();
                                    reader.onload = function () {
                                        callback(new JQL(preprocess(JSON.parse(reader.result))));
                                    };
                                    reader.readAsText(blob);
                                });
                            });
                        });
                    } else {
                        throw new Error('File "' + options.database + '" is not exists.');
                    }
                }
            };
            xhr.open('GET', options.database);
            xhr.send();

            break;

        default:
            throw new Error('Unknown database type: "' + options.database_type + '". Please define database_type explicitly (json or zip)');
        }

    };

    // get database
    loadDB(function (DB) {
        var id = options.id || 0;
        $.Thailand.DB = $.Thailand.DB ? $.Thailand.DB : {};
        $.Thailand.DB[id] = DB;
        var i,
            key,
            templates = { // template of autocomplete choices
                empty: ' ',
                suggestion: function (data) {
                    if (data.zipcode) {
                        data.zipcode = ' » ' + data.zipcode;
                    }
                    return '<div>' + data.district + ' » ' + data.amphoe + ' » ' + data.province + data.zipcode + '</div>';
                }
            },
            autocomplete_handler = function (e, v) { // set value when user selected autocomplete choice
                
                for (i in options) {
                    key = i.replace('$','');
                    if (i.indexOf('$') > -1 && options.hasOwnProperty(i) && options[i] && v[key]) {
                        options[i].typeahead('val', v[key]).trigger('change');
                    }
                }

                if (typeof options.onDataFill === 'function') {
                    delete v.likely;
                    options.onDataFill(v);
                }

            };

        for (i in options) {
            if (i.indexOf('$') > -1 && i !== '$search' && options.hasOwnProperty(i) && options[i]) {
                
                options[i].typeahead({
                    hint: true,
                    highlight: true,
                    minLength: 1
                }, {
                    limit: options.autocomplete_size,
                    templates: templates,
                    source: function (str, callback) {
                        var possibles = [],
                            field = this.$el.data('field');
                        try {
                            possibles = DB.select('*').where(field).match('^' + str).orderBy(field).fetch();
                        } catch (e) {}
                        callback(possibles);
                    },
                    display: function (data) {
                        return data[this.$el.data('field')];
                    }
                }).parent().find('.tt-dataset').data('field', i.replace('$',''));

            }
        }

        if (options.$search) {
            options.$search.typeahead({
                hint: true,
                highlight: true,
                minLength: 2
            }, {
                limit: options.autocomplete_size,
                templates: templates,
                source: function (str, callback) {
                    var possibles = [],
                        i;
                    try {
                        possibles = new JQL(possibles
                            .concat(DB.select('*').where('zipcode').match(str).fetch())
                            .concat(DB.select('*').where('province').match(str).fetch())
                            .concat(DB.select('*').where('amphoe').match(str).fetch())
                            .concat(DB.select('*').where('district').match(str).fetch())
                            .map(function(item){
                                return JSON.stringify(item);
                            }).filter(function(item, pos, self){
                                return self.indexOf(item) == pos;
                            }).map(function (self) { // give a likely score, will use to sort data later

                                self = JSON.parse(self);
                                self.likely = [
                                    similar_text(str, self.district) * 5,
                                    similar_text(str, self.amphoe.replace(/^เมือง/, '')) * 3,
                                    similar_text(str, self.province),
                                    similar_text(str, self.zipcode)
                                ].reduce(function (a, b) {
                                    return Math.max(a, b);
                                });

                                return self;

                            })).select('*').orderBy('likely desc').fetch();
                    } catch (e) {}

                    callback(possibles);
                },
                
                display: function (data) {
                    return '';
                }
            });
        }
        
        // on autocomplete
        for (i in options) {
            if (i.indexOf('$') > -1 && options.hasOwnProperty(i) && options[i]) {
                options[i]
                    .bind('typeahead:select typeahead:autocomplete', autocomplete_handler)
                    .blur(function () {
                        if (!this.value) {
                            $(this).parent().find('.tt-dataset').html('');
                        }
                    });
            }
        }

        // callback
        if (typeof options.onLoad === 'function') {
            options.onLoad();
        }

        // callback, fallback to version 1.2.
        if (typeof options.onComplete === 'function') {
            options.onComplete();
        }

    });
};
$.Thailand.defaults = {
    database: '../database/raw_database/db.json',
    database_type: 'auto', // json or zip; any other value will be ignored and script will attempt to evaluate the type from file extension instead.
    zip_worker_path: false, // path to zip worker folder e.g. './jquery.Thailand.js/dependencies/zip.js/'; Leave it to false unless you found any error.
    autocomplete_size: 20,
    id: "0",

    onLoad: function () {},
    onDataFill: function () {},

    $district: false,
    $district_code: false, // geodb only
    $amphoe: false,
    $amphoe_code: false, // geodb only
    $province: false,
    $province_code: false, // geodb only
    $zipcode: false,
    $search: false
};

$.Thailand.setup = function(options){
    $.extend($.Thailand.defaults, options);
};
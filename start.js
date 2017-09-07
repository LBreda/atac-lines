#!/usr/bin/node
'use strict';

const _drop = require('lodash/drop');
const _take = require('lodash/take');
const _concat = require('lodash/concat');

require('dotenv').config({path: __dirname + '/.env'});

const atac = require('NodeAtacAPI');
const fs = require('fs');

const atacKey = process.env.ATAC_API_KEY;
const parallelQueries = parseInt(process.env.PARALLEL_QUERIES);

const lines = JSON.parse(fs.readFileSync(__dirname + '/lines.json', 'utf8'));

/**
 * Obtaines the routes list for a bus line
 * @param {string} line Bus line
 */
let getRoutes = (line) => {
    return new Promise((resolve) => {
        atac.getRoutes(atacKey, line, (error, response) => {
            if (error) {
                console.log(error + ' - line ' + line)
                resolve([])
            }
            else {
                let ids = response.risposta.percorsi.map(percorso => {
                    return percorso.id_percorso;
                });
                resolve(ids);
            }
        });
    });
};

/**
 * Obtains a list the vehicles for a route
 * @param {string} route
 */
let getVehicles = (route) => {
    return new Promise((resolve) => {
        atac.getRoute(atacKey, route, (error, response) => {
            if (error) {
                console.log(error)
                resolve([])
            }
            else {
                let buses = response.risposta.fermate.filter(fermata => {
                    return !!(fermata.veicolo);
                }).map(fermata => {
                    return fermata.veicolo;
                });
                resolve(buses);
            }
        })
    })
};

const fillAsync = async (list, getFunction, parallel) => {
    let _list = list.slice()
    let _data = []

    while (_list.length > 0) {
        const _subset = _take(_list, parallel)

        const data = await Promise.all(_subset.map(getFunction))

        _data = _concat(_data, data.reduce((out, el) => out.concat(el), []))
        _list = _drop(_list, parallel)
    }

    return _data
}

/**
 * Main program
 */
const main = async () => {
    for (let group of lines) {
        const _groupLines = group.lines

        const _groupRoutes = await fillAsync(_groupLines, getRoutes, parallelQueries)
        const _groupBuses = await fillAsync(_groupRoutes, getVehicles, parallelQueries)
   
        group.buses = _groupBuses
    }

    lines.forEach(group => {
        console.log(group.label + ': ' + group.buses.length + ' buses')
    })
}


main()
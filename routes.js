const express = require('express');
const routes = express.Router();

routes.get('/contratos', (req, res) => {
    const query = 'SELECT * FROM Contrato LIMIT 100';

    req.getConnection((err, conn) => {
        if (err) return res.status(500).send({
            status: 'error',
            message: err
        })

        conn.query(query, (err, data) => {
            if (err) return res.status(400).send({
                status: 'error',
                message: err
            })

            res.status(200).send({
                status: 'OK',
                data: data
            });
        })
    })
})

routes.get('/licencias', (req, res) => {
    const query = 'SELECT * FROM Licencia LIMIT 100';

    req.getConnection((err, conn) => {
        if (err) return res.status(400).send({
            status: 'error',
            message: err
        })

        conn.query(query, (err, data) => {
            if (err) return res.status(400).send({
                status: 'error',
                message: err
            })

            res.status(200).send({
                status: 'OK',
                data: data
            });
        })
    })
})

module.exports = routes
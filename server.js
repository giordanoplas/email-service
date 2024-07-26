const express = require('express');
const mysql = require('mysql');
var bodyParser = require('body-parser');
const myconn = require('express-myconnection');
const routes = require('./routes');
var cron = require('node-cron');

const app = express()
app.set('port', process.env.API_PORT)
const dbOptions = {
    host: process.env.DATABASE_HOST,
    port: process.env.DATABASE_PORT,
    user: process.env.DATABASE_USER,
    password: process.env.DATABASE_PASSWORD,
    database: process.env.DATABASE_SCHEMA
}

// middlewares -------------------------------------------
app.use(myconn(mysql, dbOptions, 'single'))
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

var nodemailer = require("nodemailer");
var transporter = nodemailer.createTransport({
    host: process.env.EMAIL_HOST,
    port: parseInt(process.env.EMAIL_PORT),
    ignoreTLS: false,
    secure: true,
    auth: {
        user: process.env.EMAIL_USERNAME,
        pass: process.env.EMAIL_PASSWORD
    }
});

app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Headers', 'Authorization, X-API-KEY, Origin, X-Requested-With, Content-Type, Accept, Access-Control-Allow-Request-Method');
    res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT, DELETE');
    res.header('Allow', 'GET, POST, OPTIONS, PUT, DELETE');
    next();
});

// routes ------------------------------------------------
app.get('/', (req, res) => {
    res.send('Welcome to my API');
})
app.use('/api/v1', routes);

// server running ----------------------------------------
app.listen(app.get('port'), () => {
    console.log("API running on port", app.get('port'))
})

//cronExpression = '30 8 * * *' Se activa todos los dias a las 8:30am
cron.schedule('30 8 * * *', () => {
    const qContratos = `
            SELECT * FROM Contrato
            WHERE DATE(fechaTermino) BETWEEN NOW() AND (NOW() + INTERVAL 7 DAY) AND activo=1
            ORDER BY fechaTermino
        `;
    const qLicencias = `
            SELECT * FROM Licencia
            WHERE DATE(fechaVencimiento) BETWEEN NOW() AND (NOW() + INTERVAL 7 DAY) AND activo=1
            ORDER BY fechaVencimiento
        `;
    const qUsuarios = 'SELECT nombre, email FROM Usuario WHERE activo=1';

    var contratos = [];
    var licencias = [];
    var usuarios = [];

    const connection = mysql.createConnection({
        host: process.env.DATABASE_HOST,
        port: process.env.DATABASE_PORT,
        user: process.env.DATABASE_USER,
        password: process.env.DATABASE_PASSWORD,
        database: process.env.DATABASE_SCHEMA,
        multipleStatements: true
    });

    connection.connect(async (error) => {
        if (error) throw error;
        console.log('Connected to MySQL database!');
    });

    connection.query(`${qContratos}; ${qLicencias}; ${qUsuarios}`, (error, results) => {
        if (error) throw error;
        contratos = results[0];
        licencias = results[1];
        usuarios = results[2];

        if (contratos.length > 0 || licencias.length > 0) {
            var htmlEmail = "";
            var emailTo = "";

            if (contratos.length > 0) {
                htmlEmail += "<h2 style='color:red; font-weight:bold'>Contratos:</h2><hr/>"
                contratos.map(arg => {
                    htmlEmail += `                    
                        Id: <b>${arg.id}</b><br/>
                        Tipo: <b>${arg.tipoContrato}</b><br/>
                        Vencimiento: <b>${arg.fechaTermino.toLocaleDateString("es-CO")}</b><br/>
                        Departamento: <b>${arg.departamento}</b><br/>                    
                        <hr/>                    
                    `;
                })
            }

            if (licencias.length > 0) {
                htmlEmail += "<h2 style='color:red; font-weight:bold'>Licencias:</h2><hr/>"
                licencias.map(arg => {
                    htmlEmail += `                    
                        Id: <b>${arg.id}</b><br/>
                        Institución: <b>${arg.institucion}</b><br/>
                        Vencimiento: <b>${arg.fechaVencimiento.toLocaleDateString("es-CO")}</b><br/>                   
                        <hr/>                    
                    `;
                })
            }

            usuarios.map((arg, index) => {
                emailTo += usuarios.length === (parseInt(index) + 1) ? arg.email : arg.email + ', ';
            })

            var mailOptions = {
                from: process.env.EMAIL_DEFAULT_FROM,
                to: emailTo,
                //to: "giordanop@cementoscibao.com",
                subject: "CONTRATOS y/o LICENCIAS por vencer",
                text: "CONTRATOS y/o LICENCIAS por vencer",
                html: htmlEmail
            };

            transporter.sendMail(mailOptions, (error, info) => {
                if (error) throw error;
                console.log('Email sent: ' + info.response);
            });
        }
    });

    connection.end((error) => {
        if (error) throw error;
        console.log('MySQL connection closed.');
    });

    console.log('running a task every day at 8:30 AM');
});
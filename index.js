const express = require('express');
const app = express();
const cors = require('cors');
const mongoose = require('mongoose');
const Invoice = require('./models/Invoices'); 
const fs = require('fs');
const numWords = require('num-words');
const puppeteer = require('puppeteer');
require("dotenv").config();

app.use(express.static('public'));
app.use(express.static(`/Projects/Invoice App/API/`));
app.use(express.json());
app.use(cors({origin: 'https://dkengineering.vercel.app'}));

mongoose.connect("mongodb+srv://elvinkhunt:dkengineeringbyelvin@cluster0.h4rmzcd.mongodb.net/DK-Eng-Data?retryWrites=true&w=majority")
.then(()=>{
    console.log("Mongo Connected Successfully");
})
.catch((err)=>{
    console.log("Failed to Connect",err);
});

app.get("/",(req,res)=>{
    res.status(500).send("Get route called");
})

app.post("/invoice/create",async (req,res)=>{
    const invoiceData = req.body;
    const timestamp = Date.now();
    const customerName = (invoiceData.customerName).replace(/\s+/g, "").toLowerCase();
    const fiveChar = customerName.slice(0, 5).padEnd(5, 'x');
    const uniqueId = `${timestamp}-${fiveChar}`;
    const CustomerDetail = {InvoiceNo:invoiceData.invoiceNo, Date:invoiceData.date, customerName:invoiceData.customerName, Address:invoiceData.address, PlaceOfSupply:invoiceData.placeOfSupply, GSTNo:invoiceData.gstInNo};
    const ProductsDetails = invoiceData.products;
    const BillingDetails = {TaxableAmount:invoiceData.amount,CentTax:invoiceData.centralTax,StateTax:invoiceData.stateTax,GrandTotal:invoiceData.grandTotal,RoundOff:invoiceData.roundOff, CentTaxAmt:invoiceData.centralTaxAmount, StateTaxAmt:invoiceData.stateTaxAmount}
    try{
        const InvoiceCreated = await Invoice.create({
            id: uniqueId,
            CustomerDetail,
            ProductsDetails,
            BillingDetails
        });
        res.json(InvoiceCreated.id);
    }
    catch(e){
        res.status(400).json(e);
    }
});

app.post("/invoice/download/:invoiceId",async(req,res)=>{
    const data = await Invoice.findOne({id:req.params.invoiceId});
    try {
    const fileName = data.id;
    const amount = parseFloat(data.BillingDetails.GrandTotal);
    const amountInWords = numWords(parseInt(amount));
    const amountInWordsCapitalized = amountInWords.toLowerCase().split(' ').map((word) => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
    const originalDate = new Date(data.CustomerDetail.Date);
    const day = originalDate.getDate();
    const month = originalDate.getMonth() + 1;
    const year = originalDate.getFullYear();
    const formattedDay = day < 10 ? `0${day}` : day;
    const formattedMonth = month < 10 ? `0${month}` : month;
    const formattedDateString = `${formattedDay}/${formattedMonth}/${year}`;
    const htmlTempData = fs.readFileSync(`./pages/bill.html`);
    let billTemplate = htmlTempData.toString();
    billTemplate = billTemplate.replace(/###_Company_name_###/g, data.CustomerDetail.customerName).replace(/##_Address_Body_##/g,data.CustomerDetail.Address).replace(/##_Place_##/g,data.CustomerDetail.PlaceOfSupply).replace(/##_GSTIN_##/g,data.CustomerDetail.GSTNo);
    billTemplate = billTemplate.replace(/##_Taxable_Amt_##/g,data.BillingDetails.TaxableAmount).replace(/##_Central_Tax_##/g,data.BillingDetails.CentTax).replace(/##_Cent_Amt_##/g,data.BillingDetails.CentTaxAmt).replace(/##_State_Tax_##/g,data.BillingDetails.StateTax).replace(/##_State_Amt_##/g,data.BillingDetails.StateTaxAmt).replace(/##_Round_off_##/g,data.BillingDetails.RoundOff).replace(/##_Grand_Total_##/g,data.BillingDetails.GrandTotal).replace(/##_Total_##/g,data.BillingDetails.TaxableAmount);
    billTemplate = billTemplate.replace(/##_Bill_Amount_Word_##/g,amountInWordsCapitalized).replace(/##_INV_NO_##/g,data.CustomerDetail.InvoiceNo).replace(/##_Date_##/g,formattedDateString);
    
    let htmlTable = "";
    for(let i = 0 ; i<data.ProductsDetails.length; i++){
        const {productDescription, hsnCode, quantity, rate, amount} = data.ProductsDetails[i];
        htmlTable += '<tr class="bill-data"><td class="desc-data">'+productDescription+'</td><td>'+hsnCode+'</td><td>'+quantity+'</td><td>'+rate+'</td><td>'+amount+'</td></tr>';
    }
    for(let i=9; i>data.ProductsDetails.length; i--){
        htmlTable += '<tr class="bill-data"><td></td><td></td><td></td><td></td><td></td></tr>'
    }
    billTemplate = billTemplate.replace(/##_Table_Body_##/g,htmlTable);
    // console.log(billTemplate);

    (async () => {
        const browser = await puppeteer.launch({
            executablePath: process.env.NODE_ENV === "production" ? process.env.PUPPETEER_EXECUTABLE_PATH : puppeteer.executablePath(),
            args: ['--no-sandbox',"--disabled-setupid-sandbox", "--single-process", "--no-zygote"]
        });
        const page = await browser.newPage();
        await page.setContent(billTemplate);
        const pdfBuffer = await page.pdf({
          format: 'A4',
          printBackground: true,
        });
        await browser.close();
        const pdfFileName = `${fileName}.pdf`;
        const pdfPath = `${pdfFileName}`;
        fs.writeFileSync(pdfPath, pdfBuffer);
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename="${pdfFileName}"`);
        res.end(pdfBuffer, () => {
            fs.unlink(pdfPath, (err) => {
                if (err) {
                    console.error(`Error deleting PDF file: ${err}`);
                } else {
                    console.log(`Deleted PDF file: ${pdfPath}`);
                }
            });
        });
      })();
    } catch (e) {
      console.log("Error", e);
      res.status(500).json({ error: "An error occurred" });
    }
});

app.listen(4000, ()=> {
    console.log("Server is listening port 4000");
});

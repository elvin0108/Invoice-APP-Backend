const mongoose = require('mongoose');

const InvoiceSchema = new mongoose.Schema({
    id: String,
    CustomerDetail: {
        customerName: String,
        Address: String,
        PlaceOfSupply: String,
        GSTNo: String,
    },
    ProductsDetails: [
        {
            productDescription: String,
            hsnCode: String,
            quantity: String,
            rate: String,
            amount: String,
        },
    ],
    BillingDetails: {
        TaxableAmount: Number,
        CentTax: Number,
        CentTaxAmt: Number,
        StateTax: Number,
        StateTaxAmt: Number,
        GrandTotal: Number,
        RoundOff: Number,
    },
},
{
    timestamps: {
        createdAt: 'createdAt',
        updatedAt: 'updatedAt'
    }
});

const InvoiceModel = mongoose.model("Invoices", InvoiceSchema);

module.exports = InvoiceModel;

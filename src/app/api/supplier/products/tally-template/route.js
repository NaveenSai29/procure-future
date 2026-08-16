import { NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth';

// GET - Download Tally XML sample template
export async function GET(request) {
  try {
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Generate sample Tally XML export
    const sampleXml = `<?xml version="1.0" encoding="UTF-8"?>
<ENVELOPE>
  <HEADER>
    <VERSION>1</VERSION>
    <TALLYREQUEST>Export</TALLYREQUEST>
    <TYPE>Data</TYPE>
    <SUBTYPE>All Masters</SUBTYPE>
  </HEADER>
  <BODY>
    <IMPORTDATA>
      <REQUESTDESC>
        <REPORTNAME>List of Accounts</REPORTNAME>
        <STATICVARIABLES>
          <SVEXPORTFORMAT>$$ExportedFromTally</SVEXPORTFORMAT>
        </STATICVARIABLES>
      </REQUESTDESC>
      <REQUESTDATA>
        <TALLYMESSAGE xmlns:UDF="TallyUDF">
          <STOCKITEM NAME="Sample Product 1" RESERVEDNAME="">
            <PARENT>Electronics</PARENT>
            <BASEUNITS>PCS</BASEUNITS>
            <OPENINGBALANCE>100</OPENINGBALANCE>
            <CLOSINGBALANCE>100</CLOSINGBALANCE>
            <GSTDETAILS>
              <HSNCODE>8471</HSNCODE>
              <GSTRATE>18</GSTRATE>
            </GSTDETAILS>
            <MRP>1000.00</MRP>
            <STANDARDPRICE>899.00</STANDARDPRICE>
            <GODOWN>Main Warehouse</GODOWN>
          </STOCKITEM>
          <STOCKITEM NAME="Sample Product 2" RESERVEDNAME="">
            <PARENT>Pipes</PARENT>
            <BASEUNITS>PCS</BASEUNITS>
            <OPENINGBALANCE>50</OPENINGBALANCE>
            <CLOSINGBALANCE>50</CLOSINGBALANCE>
            <GSTDETAILS>
              <HSNCODE>7306</HSNCODE>
              <GSTRATE>18</GSTRATE>
            </GSTDETAILS>
            <MRP>500.00</MRP>
            <STANDARDPRICE>450.00</STANDARDPRICE>
            <GODOWN>Main Warehouse</GODOWN>
          </STOCKITEM>
        </TALLYMESSAGE>
      </REQUESTDATA>
    </IMPORTDATA>
  </BODY>
</ENVELOPE>`;

    return new NextResponse(sampleXml, {
      headers: {
        'Content-Type': 'application/xml',
        'Content-Disposition': 'attachment; filename="tally-sample-export.xml"',
      },
    });
  } catch (error) {
    console.error('Tally template error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to generate template' },
      { status: 500 }
    );
  }
}
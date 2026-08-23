import type { InvoiceDetail, InvoiceLine, InvoiceSnapshot } from '../api/platformApi';
import { formatDate, formatZAR } from '../lib/format';
import { centsToRand } from '../lib/invoiceMoney';

export type InvoicePreviewModel = {
  invoiceNumber: string;
  status: string;
  presentationStatus: string;
  invoiceDate: string;
  dueDate: string;
  poReference?: string | null;
  notes?: string | null;
  paymentTerms?: string | null;
  paymentDate?: string | null;
  snapshot: InvoiceSnapshot;
  lines: Array<Pick<
    InvoiceLine,
    | 'description'
    | 'quantity'
    | 'unitPriceCents'
    | 'discountCents'
    | 'vatRatePercent'
    | 'lineSubtotalCents'
    | 'lineVatCents'
    | 'lineTotalCents'
  >>;
  totals: { subtotalCents: number; vatCents: number; totalCents: number };
};

const money = (cents: number) => formatZAR(Number(centsToRand(cents)), true);

const toneFor = (status: string): string => {
  if (status === 'paid') return 'green';
  if (status === 'overdue') return 'red';
  if (status === 'sent') return 'blue';
  if (status === 'voided') return 'amber';
  return 'grey';
};

const addressLines = (snapshot: InvoiceSnapshot): string =>
  [
    snapshot.address,
    [snapshot.city, snapshot.province, snapshot.postalCode].filter(Boolean).join(', '),
    snapshot.country,
  ]
    .filter((line) => line && line.trim())
    .join('\n');

export function invoiceDetailToPreview(invoice: InvoiceDetail): InvoicePreviewModel {
  return {
    invoiceNumber: invoice.invoiceNumber,
    status: invoice.status,
    presentationStatus: invoice.presentationStatus,
    invoiceDate: invoice.invoiceDate,
    dueDate: invoice.dueDate,
    poReference: invoice.poReference,
    notes: invoice.notes,
    paymentTerms: invoice.paymentTerms,
    paymentDate: invoice.paymentDate,
    snapshot: invoice.snapshot,
    lines: invoice.lines,
    totals: {
      subtotalCents: invoice.subtotalCents,
      vatCents: invoice.vatCents,
      totalCents: invoice.totalCents,
    },
  };
}

/** On-screen preview of the stored invoice snapshot (same content as the PDF). */
export function InvoiceDocument({ invoice }: { invoice: InvoicePreviewModel }) {
  const status = invoice.presentationStatus || invoice.status;
  const snapshot = invoice.snapshot;
  return (
    <div className="invoice-doc" id="invoice-print">
      <div className="inv-head">
        <div className="inv-brand">
          <span className="inv-logo"><img src="/brand/icon-blue.svg" alt="" /></span>
          <div>
            <div className="inv-co">AdvisorTrack</div>
            <div className="inv-co-sub">hello@advisortrack.co.za</div>
          </div>
        </div>
        <div className="inv-title">
          <h1>TAX INVOICE</h1>
          <div className="inv-num">{invoice.invoiceNumber}</div>
          <span className={`pill ${toneFor(status)}`}>{status}</span>
        </div>
      </div>

      <div className="inv-parties">
        <div>
          <div className="inv-label">Bill to</div>
          <div className="inv-strong">{snapshot.registeredName}</div>
          {snapshot.tradingName && snapshot.tradingName !== snapshot.registeredName ? (
            <div className="inv-muted">Trading as {snapshot.tradingName}</div>
          ) : null}
          {snapshot.registrationNumber ? <div className="inv-muted">Reg {snapshot.registrationNumber}</div> : null}
          <div className="inv-muted">
            {snapshot.vatRegistered ? `VAT ${snapshot.vatNumber || 'registered'}` : 'Not VAT registered'}
          </div>
          {snapshot.billingContactName ? <div className="inv-muted">{snapshot.billingContactName}</div> : null}
          {snapshot.billingEmail ? <div className="inv-muted">{snapshot.billingEmail}</div> : null}
          {snapshot.telephone ? <div className="inv-muted">{snapshot.telephone}</div> : null}
          <div className="inv-muted" style={{ whiteSpace: 'pre-line' }}>{addressLines(snapshot)}</div>
        </div>
        <div className="inv-dates">
          <div className="inv-date-row"><span className="inv-label">Invoice date</span><span>{formatDate(invoice.invoiceDate)}</span></div>
          <div className="inv-date-row"><span className="inv-label">Due date</span><span>{formatDate(invoice.dueDate)}</span></div>
          {invoice.poReference ? (
            <div className="inv-date-row"><span className="inv-label">PO / reference</span><span>{invoice.poReference}</span></div>
          ) : null}
          {invoice.paymentDate ? (
            <div className="inv-date-row"><span className="inv-label">Payment date</span><span>{formatDate(invoice.paymentDate)}</span></div>
          ) : null}
        </div>
      </div>

      <table className="inv-table">
        <thead>
          <tr>
            <th>Description</th>
            <th className="num">Qty</th>
            <th className="num">Unit price</th>
            <th className="num">Discount</th>
            <th className="num">VAT</th>
            <th className="num">Amount</th>
          </tr>
        </thead>
        <tbody>
          {invoice.lines.map((line, index) => (
            <tr key={index}>
              <td>{line.description}</td>
              <td className="num">{line.quantity}</td>
              <td className="num">{money(line.unitPriceCents)}</td>
              <td className="num">{money(line.discountCents)}</td>
              <td className="num">{Number(line.vatRatePercent).toFixed(2)}%</td>
              <td className="num">{money(line.lineTotalCents)}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="inv-totals">
        <div className="inv-total-row"><span>Subtotal</span><span>{money(invoice.totals.subtotalCents)}</span></div>
        <div className="inv-total-row"><span>VAT</span><span>{money(invoice.totals.vatCents)}</span></div>
        <div className="inv-total-row grand"><span>Total due</span><span>{money(invoice.totals.totalCents)}</span></div>
      </div>

      {(invoice.paymentTerms || invoice.notes) && (
        <div className="inv-notes">
          <div className="inv-label">Notes / payment terms</div>
          {invoice.paymentTerms ? <p>{invoice.paymentTerms}</p> : null}
          {invoice.notes ? <p>{invoice.notes}</p> : null}
        </div>
      )}

      <div className="inv-foot">
        Thank you for partnering with AdvisorTrack. Payment due by {formatDate(invoice.dueDate)}.
      </div>
    </div>
  );
}

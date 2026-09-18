import type { ChangeEvent, ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { DateInput, Field, SelectInput, TextArea, TextInput } from './ui';
import { CompanyContextField } from './CompanyContext';

export type Option = { value: string; label: string };

export type UserFormLicencePool = {
  purchased: number | null;
  assigned: number;
  available: number | null;
};

type FormValueHandler = (name: string, value: string) => void;

function onChange(handler: FormValueHandler, name: string) {
  return (event: ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    handler(name, event.target.value);
  };
}

function formatPoolCount(value: number | null | undefined): string {
  if (value == null) return 'Unlimited';
  return String(value);
}

function YesNoSelect({
  name,
  value,
  onChangeValue,
  disabled,
  testId,
}: {
  name: string;
  value: string;
  onChangeValue: FormValueHandler;
  disabled?: boolean;
  testId?: string;
}) {
  return (
    <SelectInput
      value={value === 'yes' ? 'yes' : 'no'}
      onChange={onChange(onChangeValue, name)}
      disabled={disabled}
      data-testid={testId}
    >
      <option value="no">No</option>
      <option value="yes">Yes</option>
    </SelectInput>
  );
}

/** Presentational user-management field set. Does not submit or persist. */
export function UserFormFields({
  values,
  onChangeValue,
  roleOptions = [],
  teamOptions = [],
  regionOptions = [],
  showTeam = true,
  showRegion = true,
  emailDisabled = false,
  companyName = null,
  createMode = false,
  licencePool = null,
  requestLicencesHref = '/licences',
  requestLicencesAction = null,
}: {
  values: Record<string, string>;
  onChangeValue: FormValueHandler;
  roleOptions?: Option[];
  teamOptions?: Option[];
  regionOptions?: Option[];
  showTeam?: boolean;
  showRegion?: boolean;
  emailDisabled?: boolean;
  companyName?: string | null;
  createMode?: boolean;
  licencePool?: UserFormLicencePool | null;
  requestLicencesHref?: string;
  requestLicencesAction?: ReactNode;
}) {
  const assignLicence = values.assignLicence === 'yes';
  const noneAvailable = licencePool?.available === 0;
  const availableAfter =
    createMode && assignLicence && licencePool?.available != null
      ? Math.max(0, licencePool.available - 1)
      : null;

  return (
    <div className="form-grid cols-2">
      <CompanyContextField name={companyName} />
      <Field label="First name">
        <TextInput value={values.firstName ?? ''} onChange={onChange(onChangeValue, 'firstName')} />
      </Field>
      <Field label="Last name">
        <TextInput value={values.lastName ?? ''} onChange={onChange(onChangeValue, 'lastName')} />
      </Field>
      <Field label="Email">
        <TextInput
          type="email"
          value={values.email ?? ''}
          onChange={onChange(onChangeValue, 'email')}
          disabled={emailDisabled}
        />
      </Field>
      <Field label="Mobile">
        <TextInput value={values.mobile ?? ''} onChange={onChange(onChangeValue, 'mobile')} />
      </Field>
      <Field label={createMode ? 'Reporting role' : 'Role'}>
        <SelectInput
          value={values.roleId ?? ''}
          onChange={onChange(onChangeValue, 'roleId')}
          data-testid="add-user-reporting-role"
        >
          <option value="">Select role</option>
          {roleOptions.map((option) => (
            <option key={option.value} value={option.value}>{option.label}</option>
          ))}
        </SelectInput>
      </Field>
      {showRegion ? (
        <Field label="Region" hint="Organisation region">
          <SelectInput
            value={values.regionId ?? ''}
            onChange={onChange(onChangeValue, 'regionId')}
            data-testid="add-user-region"
          >
            <option value="">Select region</option>
            {regionOptions.map((option) => (
              <option key={option.value} value={option.value}>{option.label}</option>
            ))}
          </SelectInput>
        </Field>
      ) : null}
      {showTeam ? (
        <Field label="Team" hint="Organisation team">
          <SelectInput
            value={values.teamId ?? ''}
            onChange={onChange(onChangeValue, 'teamId')}
            data-testid="add-user-team"
          >
            <option value="">Select team</option>
            {teamOptions.map((option) => (
              <option key={option.value} value={option.value}>{option.label}</option>
            ))}
          </SelectInput>
        </Field>
      ) : null}
      {createMode ? (
        <>
          <Field
            label="Organisation Administrator"
            hint="Company-scoped grant. Not a reporting role."
          >
            <YesNoSelect
              name="organisationAdmin"
              value={values.organisationAdmin ?? 'no'}
              onChangeValue={onChangeValue}
              testId="add-user-org-admin"
            />
          </Field>
          <Field label="Assign licence">
            <YesNoSelect
              name="assignLicence"
              value={noneAvailable ? 'no' : values.assignLicence ?? 'no'}
              onChangeValue={onChangeValue}
              disabled={noneAvailable}
              testId="add-user-assign-licence"
            />
          </Field>
          <Field label="Send invitation">
            <YesNoSelect
              name="sendInvitation"
              value={values.sendInvitation ?? 'yes'}
              onChangeValue={onChangeValue}
              testId="add-user-send-invitation"
            />
          </Field>
          {licencePool ? (
            <div className="span-2" data-testid="add-user-licence-pool">
              <div className="field-label">Licence pool</div>
              <p className="muted" style={{ margin: '4px 0 0' }}>
                Purchased: {formatPoolCount(licencePool.purchased)}
                <br />
                Assigned: {licencePool.assigned}
                <br />
                Available: {formatPoolCount(licencePool.available)}
                {availableAfter != null ? (
                  <>
                    <br />
                    Available after creation: {availableAfter}
                  </>
                ) : null}
              </p>
              {noneAvailable ? (
                <p className="field-error" data-testid="add-user-no-licences" style={{ marginTop: 8 }}>
                  No licences are available. Assignment is disabled.
                  {' '}
                  {requestLicencesAction ?? (
                    <Link to={requestLicencesHref}>Add / Request Licences</Link>
                  )}
                </p>
              ) : null}
            </div>
          ) : null}
        </>
      ) : null}
    </div>
  );
}

/** Presentational customer billing field set. Does not submit or persist. */
export function CustomerFormFields({
  values,
  onChangeValue,
}: {
  values: Record<string, string>;
  onChangeValue: FormValueHandler;
}) {
  return (
    <div className="form-grid cols-2">
      <Field label="Registered company name">
        <TextInput value={values.registeredName ?? ''} onChange={onChange(onChangeValue, 'registeredName')} />
      </Field>
      <Field label="Trading name">
        <TextInput value={values.tradingName ?? ''} onChange={onChange(onChangeValue, 'tradingName')} />
      </Field>
      <Field label="Registration number">
        <TextInput value={values.registrationNumber ?? ''} onChange={onChange(onChangeValue, 'registrationNumber')} />
      </Field>
      <Field label="VAT registered">
        <SelectInput value={values.vatRegistered ?? 'false'} onChange={onChange(onChangeValue, 'vatRegistered')}>
          <option value="false">No</option>
          <option value="true">Yes</option>
        </SelectInput>
      </Field>
      <Field label="VAT number" hint="Required only if VAT registered, when the invoice is issued.">
        <TextInput value={values.vatNumber ?? ''} onChange={onChange(onChangeValue, 'vatNumber')} />
      </Field>
      <Field label="Billing contact">
        <TextInput value={values.billingContact ?? ''} onChange={onChange(onChangeValue, 'billingContact')} />
      </Field>
      <Field label="Billing email">
        <TextInput type="email" value={values.billingEmail ?? ''} onChange={onChange(onChangeValue, 'billingEmail')} />
      </Field>
      <Field label="Telephone">
        <TextInput value={values.telephone ?? ''} onChange={onChange(onChangeValue, 'telephone')} />
      </Field>
      <Field label="City">
        <TextInput value={values.city ?? ''} onChange={onChange(onChangeValue, 'city')} />
      </Field>
      <Field label="Province">
        <TextInput value={values.province ?? ''} onChange={onChange(onChangeValue, 'province')} />
      </Field>
      <Field label="Postal code">
        <TextInput value={values.postalCode ?? ''} onChange={onChange(onChangeValue, 'postalCode')} />
      </Field>
      <Field label="Country">
        <TextInput value={values.country ?? ''} onChange={onChange(onChangeValue, 'country')} />
      </Field>
      <Field label="Address">
        <TextArea rows={3} value={values.address ?? ''} onChange={onChange(onChangeValue, 'address')} />
      </Field>
    </div>
  );
}

/** Presentational subscription field set. Does not submit or persist. */
export function SubscriptionFormFields({
  values,
  onChangeValue,
  statusOptions = [],
  planOptions = [],
}: {
  values: Record<string, string>;
  onChangeValue: FormValueHandler;
  statusOptions?: Option[];
  planOptions?: Option[];
}) {
  return (
    <div className="form-grid cols-2">
      <Field label="Customer / company">
        <TextInput value={values.companyName ?? ''} onChange={onChange(onChangeValue, 'companyName')} />
      </Field>
      <Field label="Status">
        <SelectInput value={values.status ?? ''} onChange={onChange(onChangeValue, 'status')}>
          <option value="">Select status</option>
          {statusOptions.map((option) => (
            <option key={option.value} value={option.value}>{option.label}</option>
          ))}
        </SelectInput>
      </Field>
      <Field label="Plan">
        <SelectInput value={values.plan ?? ''} onChange={onChange(onChangeValue, 'plan')}>
          <option value="">Select plan</option>
          {planOptions.map((option) => (
            <option key={option.value} value={option.value}>{option.label}</option>
          ))}
        </SelectInput>
      </Field>
      <Field label="Licence price">
        <TextInput value={values.licencePrice ?? ''} onChange={onChange(onChangeValue, 'licencePrice')} />
      </Field>
      <Field label="Purchased licences">
        <TextInput value={values.purchasedLicences ?? ''} onChange={onChange(onChangeValue, 'purchasedLicences')} />
      </Field>
      <Field label="Billing cycle">
        <TextInput value={values.billingCycle ?? ''} onChange={onChange(onChangeValue, 'billingCycle')} />
      </Field>
      <Field label="Start date">
        <DateInput value={values.startDate ?? ''} onChange={onChange(onChangeValue, 'startDate')} />
      </Field>
      <Field label="Renewal date">
        <DateInput value={values.renewalDate ?? ''} onChange={onChange(onChangeValue, 'renewalDate')} />
      </Field>
      <Field label="Billing contact">
        <TextInput value={values.billingContact ?? ''} onChange={onChange(onChangeValue, 'billingContact')} />
      </Field>
    </div>
  );
}

/** Presentational invoice field set. Does not calculate or persist. */
export function InvoiceFormFields({
  values,
  onChangeValue,
}: {
  values: Record<string, string>;
  onChangeValue: FormValueHandler;
}) {
  return (
    <div className="form-grid cols-2">
      <Field label="Invoice number" hint="Assigned automatically. Cannot be edited.">
        <TextInput value={values.invoiceNumber || 'Assigned on save'} disabled />
      </Field>
      <Field label="Customer">
        <TextInput value={values.customer ?? ''} onChange={onChange(onChangeValue, 'customer')} />
      </Field>
      <Field label="Invoice date">
        <DateInput value={values.invoiceDate ?? ''} onChange={onChange(onChangeValue, 'invoiceDate')} />
      </Field>
      <Field label="Due date">
        <DateInput value={values.dueDate ?? ''} onChange={onChange(onChangeValue, 'dueDate')} />
      </Field>
      <Field label="PO / reference">
        <TextInput value={values.poNumber ?? ''} onChange={onChange(onChangeValue, 'poNumber')} />
      </Field>
      <Field label="Description">
        <TextInput value={values.description ?? ''} onChange={onChange(onChangeValue, 'description')} />
      </Field>
      <Field label="Quantity">
        <TextInput value={values.quantity ?? ''} onChange={onChange(onChangeValue, 'quantity')} />
      </Field>
      <Field label="Unit price">
        <TextInput value={values.unitPrice ?? ''} onChange={onChange(onChangeValue, 'unitPrice')} />
      </Field>
      <Field label="Notes / payment terms">
        <TextArea rows={3} value={values.notes ?? ''} onChange={onChange(onChangeValue, 'notes')} />
      </Field>
    </div>
  );
}

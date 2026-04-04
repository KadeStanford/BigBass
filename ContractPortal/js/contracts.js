// ================================================
// Contract Templates — Big Bass Tree Services, LLC
// ================================================

const RATE_ITEMS = [
    { id: 1, name: '135 Ton Knuckle Boom Crane with Grapple Saw', desc: 'Crane is used to reach long distances and remove material that would not be safe for workers to enter. Price includes operator.' },
    { id: 2, name: '50 Ton Telescopic Truck Crane', desc: '' },
    { id: 3, name: 'Skid Steer', desc: 'Used to move material to allow safe work areas for the crew. Also allows removal of material from the crane landing zone.' },
    { id: 4, name: 'Stump Grinder', desc: 'Machine is key in removing roots that are still attached to root balls. Roots must be cut to allow the grapple crane to lift the stump.' },
    { id: 5, name: 'Aerial Lift / Bucket Truck', desc: 'Lift is used to hoist personnel. It is much safer than traditional climbing methods.' },
    { id: 6, name: 'Labor Per Person', desc: 'Includes spotters, riggers, sawyers, lift operators, skid steer operators, stump grinder operators.', hasQty: true },
    { id: 7, name: 'Ground Protection Mats', desc: 'Mats used to allow ingress and egress of heavy equipment and to mitigate further loss of property.' },
    { id: 8, name: 'Tarps', desc: '' },
    { id: 9, name: 'Debris Hauling', desc: '20% of all equipment and labor. Covers material removed from the curb to an approved disposal location.' },
    { id: 10, name: 'Travel', desc: '' },
    { id: 11, name: 'Other', desc: '' }
];

// Shared legal sections used in both contracts
const LEGAL_SECTIONS = {
    scopeTerms: `<span class="section-title">SCOPE OF THE WORK, TERMS AND PAYMENT:</span> By signing below, the Customer Agrees to the scope of work and the terms set forth herein, as well as the prices pursuant to the rate sheet attached. Big Bass Tree Service, LLC, (hereinafter, Big Bass Tree Service) reserves the right, in its sole and absolute judgment, to determine what equipment, labor, and materials will be used to safely perform the work. Big Bass Tree Service is a licensed Louisiana arborist, license number 2687, and insured. The Customer is hiring Big Bass Tree Service to perform the scope of services set forth herein and expressly agrees to help Big Bass Tree Service receive payment from the insurance carrier. The Customer allows Big Bass Tree Service to contact, interact with, bill, and respond to the insurance company directly; however, Big Bass Tree Service is under no obligation to do so in order to obtain insurance proceeds or payment, as this responsibility remains the responsibility of the Customer. Customer is assigning the value of insurance benefits for the tree removal portion only to Big Bass Tree Service and agrees that the insurance company may issue and mail payment directly to Big Bass Tree Service. In the event that the price for Big Bass Tree Service's services exceeds the recovery allowed by insurance because of maximum coverage, an exclusion, or otherwise, the Customer is responsible for the payment to Big Bass Tree Service for its services as set forth herein. All accounts are net payable upon completion of the work. The Customer provides a personal guarantee for payment for the services rendered herein by Big Bass Tree Service, regardless of insurance. Any balances not collected after ten (10) days of invoice date will be assessed a five percent (5%) late fee each month until paid, plus any and all cost of collection, including but not limited to reasonable attorney's fees, court cost, and interest in the event of the Customer failing to pay. Any proceedings involving collection shall be pursuant to Louisiana law and in the venue where the work is performed, or where Big Bass Tree Service, is domiciled.`,

    lien: `<span class="section-title">LIEN:</span> If Customer fails to pay Big Bass Tree Service for the work, Big Bass Tree Service shall be entitled to record a construction/contractor's lien against the property upon which the work is sited. Big Bass Tree Service is not a residential or commercial builder, alteration contractor, electrician, plumber, or electrical contractor, and is not required to have a license to perform the work under this contract.`,

    deliveryOfProperty: `<span class="section-title">DELIVERY OF THE PROPERTY:</span> Customer is responsible for delivering the property to Big Bass Tree Service in workable condition and shall use its best efforts to facilitate Big Bass Tree Service's performance of the work. The property shall be delivered to Big Bass Tree Service in a stable and safe working environment free from pet waste and other hazardous waste. There will be a $300.00 fee charged for any feces in the yard where the work is performed. Customer agrees to keep the driveways clear and available for movement and parking of trucks and equipment to be used during normal work hours or as otherwise requested as necessary to perform the work. Big Bass Tree Service, its employees, and those with whom it is working shall not be expected to keep gates closed to animals or children.`,

    permits: `<span class="section-title">PERMITS:</span> Customer is responsible for and shall obtain and pay for all required permits.`,

    propertyLines: `<span class="section-title">PROPERTY LINES AND RESTRICTIONS:</span> Customer shall indicate to Big Bass Tree Service the boundaries of the property upon which the work site rests and is responsible for the accuracy of the markers. Customer agrees to provide Big Bass Tree Service with a copy of any restrictions, easements, or rights of way.`,

    inherentHazards: `<span class="section-title">INHERENT HAZARDS AND RISKS:</span> Trees inherently pose a certain degree of hazard and risk from breakage, failure, and other causes and conditions. Recommendations made by Big Bass Tree Service are intended to minimize or reduce hazardous conditions that may be associated with trees. While such recommendations should reduce the risk of tree failure, they cannot eliminate such risk, especially in the event of a storm or any other act of God. Therefore, there is and can be no guarantee that efforts to mitigate against unsafe conditions will prevent breakage or failure of a tree. Additionally, some hazardous conditions in landscapes are apparent, while others require detailed inspection and evaluation. While a detailed inspection and evaluation should and normally does result in the detection of potentially hazardous conditions, there can be no guarantee or certainty that all hazardous conditions will be detected.`,

    unusualExpenses: `<span class="section-title">EXPENSES FOR UNUSUAL OR UNANTICIPATED CONDITIONS:</span> Customer is responsible for any and all expense and cost incurred by Big Bass Tree Service due to unusual or unanticipated conditions, environmental hazards, concealed conditions or damage, and/or existing defects, which Big Bass Tree Service discovers during the course of the work. Big Bass Tree Service is neither liable nor responsible for repairing these conditions. Customer agrees to pay Big Bass Tree Service on a time and materials basis for any unanticipated contingencies resulting in a modification to the work occasioned by for example, concrete, foreign matter, stinging insects, nests, rocks, pipes, electrical, etc. encountered in the course of the work and not otherwise specified in this contract by Big Bass Tree Service.`,

    performanceOfWork: `<span class="section-title">PERFORMANCE OF THE WORK:</span> Work crews will arrive at the job site unannounced unless otherwise noted herein. Big Bass Tree Service may remove fence boards to access the property, but replacement of these fence boards remains the responsibility of the Customer. Customer acknowledges and understands Big Bass Tree Service uses heavy machinery, and that such machinery may cause underlying damage to concrete, paved, and other prepared surfaces. Big Bass Tree Service shall not be liable for any damage caused to the property and other ground structures. Big Bass Tree Service will use reasonable care to minimize damage to concrete driveways and sidewalks by using appropriate ground protection mats for ingress and egress if the client elects to use these mats for an additional fee as shown herein. Any failure while using mats is not the responsibility of Big Bass Tree Service. Big Bass Tree Service shall have no liability or responsibility for noise or vibrations to the premises due to Big Bass Tree Service's performance of the work, or for any personal or property damage associated with or arising therefrom. Big Bass Tree Service will not be responsible for any underground objects, specifically including, but not limited to, piping, utilities, septic tanks, sewer, wiring, conduit, plumbing, electrical, gas, water lines, or sprinkler systems. Big Bass Tree Service will not be responsible for sewer cleanout or damage to septic tanks. Big Bass Tree Service will not be responsible for any unforeseen conditions. Big Bass Tree Service will use reasonable care to minimize damage to trees, vegetation, landscaping, fences and grass/yards, but Big Bass Tree Service will not be responsible for any damages to trees, vegetation, landscaping, fences and grass/yards and the like. Big Bass Tree Service shall attempt to meet all performance dates, but shall not be liable for damages due to delays from inclement weather or other causes beyond our control.`,

    tarps: `<span class="section-title">TARPS:</span> Big Bass Tree Service may tarp a structure or other item to protect it prior to, during, and after work. Big Bass Tree Service cannot guarantee that tarp will protect a structure during all weather conditions or events or remain intact or in place. Customer acknowledges, understands, and agrees that a tarp may dislodge and cause damage to other items of personal property and that Big Bass Tree Service shall not be liable for any damage arising therefrom or in relations thereto.`,

    noLiability: `<span class="section-title">NO LIABILITY:</span> Big Bass Tree Service shall not be involved in or liable for any conflicts pursuant to La. R.S. 3:4278.1, trespass, or allegations, claims, demands, or suits for damages in any way related to property belonging to another. Customer represents and warrants that Customer is the owner of all of the property, including, but not limited to, trees, shrubs, plants, flowers, bushes, fencing, land, grass, for which it has hired Big Bass Tree Service's services, or Customer has the proper authority to have the services of Big Bass Tree Service performed. Customer shall indemnify, hold harmless, and defend Big Bass Tree Service from any and all allegations, claims, demands, or suits arising from La. R.S. 3:4278.1, trespass and/or Big Bass Tree Service's services on any property belonging to another.`,

    actOfGod: `<span class="section-title">ACT OF GOD:</span> You understand, acknowledge, and agree that work may be postponed, in whole or in part, due to the exigencies beyond Big Bass Tree Service's control, including, but not limited to, declarations of governmental bodies, hazardous or impenetrable road conditions, weather, strike, war, insurrection, supply chain restrictions, etc. and that your obligations under this contract are not relieved due to any such delay.`,

    indemnification: `<span class="section-title">INDEMNIFICATION:</span> By execution of this contract, you expressly agree to defend, indemnify and hold harmless Big Bass Tree Service from and against any and all damages, losses, claims, and actions of any person whatsoever arising out of any damage caused to any person or property arising in the course of the work, unless occasioned by an improper intentional act of Big Bass Tree Service.`,

    limitationOfRecovery: `<span class="section-title">LIMITATION OF RECOVERY:</span> In the event of damage, loss, claim, or action for which you have the right of recovery, you expressly agree that in no event shall you seek or have the right to recover damages greater than the amounts actually remitted to Big Bass Tree Service for the work.`,

    electronicComms: `<span class="section-title">ELECTRONIC COMMUNICATIONS:</span> Customer agrees to execute and exchange records and documents in electronic form. You shall promptly notify Big Bass Tree Service of any changes to your information set forth herein.`,

    severability: `<span class="section-title">SEVERABILITY AND INTERPRETATION:</span> This contract may be executed in any number of identical counterparts, all of which, when taken together, shall constitute the same instrument. The parties acknowledge and consent to be bound by electronic signatures, including signatures of any required witness. A facsimile, .pdf copy, and other electronically executed versions of documents executed by the parties shall be deemed an original for all relevant purposes.`,

    authority: `<span class="section-title">AUTHORITY AND CONSENT:</span> The undersigned has received, read, understands and agrees to this contract and requests that Big Bass Tree Service commence the work.`
};

/**
 * Render the insurance contract HTML
 */
function renderInsuranceContract(data) {
    const fv = (val) => val ? `<span class="field-value">${escapeHtml(val)}</span>` : `<span class="field-value" style="color:var(--red-500);">___________</span>`;

    return `
        <h2>SERVICES CONTRACT</h2>
        <div class="company-info">
            Big Bass Tree Services, LLC<br>
            1726 Lyman Lane<br>
            Clinton, LA 70722
        </div>

        <div class="info-grid">
            <div class="info-row"><span class="info-label">Customer's Name:</span> ${fv(data.customerName)}</div>
            <div class="info-row"><span class="info-label">Phone Number:</span> ${fv(data.phoneNumber)}</div>
            <div class="info-row"><span class="info-label">Customer's Address:</span> ${fv(data.customerAddress)}</div>
            <div class="info-row"><span class="info-label">E-Mail Address:</span> ${fv(data.emailAddress)}</div>
            <div class="info-row"><span class="info-label">Location of Services:</span> ${fv(data.locationOfServices)}</div>
            <div class="info-row"><span class="info-label">Date of Loss:</span> ${fv(data.dateOfLoss)}</div>
            <div class="info-row"><span class="info-label">Cause of Loss:</span> ${fv(data.causeOfLoss)}</div>
            <div class="info-row"><span class="info-label">Insurance Carrier:</span> ${fv(data.insuranceCarrier)}</div>
            <div class="info-row"><span class="info-label">Policy Number:</span> ${fv(data.policyNumber)}</div>
            <div class="info-row"><span class="info-label">Claim Number:</span> ${fv(data.claimNumber)}</div>
            <div class="info-row"><span class="info-label">Adjuster's Name:</span> ${fv(data.adjusterName)}</div>
            <div class="info-row"><span class="info-label">Adjuster's Phone:</span> ${fv(data.adjusterPhone)}</div>
            <div class="info-row"><span class="info-label">Adjuster's E-mail:</span> ${fv(data.adjusterEmail)}</div>
            <div class="info-row"><span class="info-label">Scope of Services:</span> ${fv(data.scopeOfServices)}</div>
            <div class="info-row"><span class="info-label">Additional Services:</span> ${fv(data.additionalServices)}</div>
            <div class="info-row"><span class="info-label">Price:</span> ${fv(data.contractPrice)}</div>
            <div class="info-row"><span class="info-label">Equipment Required:</span> ${fv(data.equipmentRequired)}</div>
            <div class="info-row"><span class="info-label">Estimated Timeframe:</span> ${fv(data.estimatedTimeframe)}</div>
        </div>

        ${renderLegalSections()}
        ${renderRateScheduleTable(data.rates)}
    `;
}

/**
 * Render the general (non-insurance) contract HTML
 */
function renderGeneralContract(data) {
    const fv = (val) => val ? `<span class="field-value">${escapeHtml(val)}</span>` : `<span class="field-value" style="color:var(--red-500);">___________</span>`;

    const agreementDate = (data.agreementDay && data.agreementMonth && data.agreementYear)
        ? `${data.agreementDay} day of ${data.agreementMonth}, ${data.agreementYear}`
        : '____';

    return `
        <h2>SERVICES CONTRACT</h2>
        <div class="company-info">
            Big Bass Tree Services, LLC<br>
            1726 Lyman Lane<br>
            Clinton, LA 70722
        </div>

        <div class="agreement-header">
            THIS AGREEMENT is made on this ${fv(agreementDate)}, by and between Big Bass Tree Services, LLC (hereinafter "Owner") and ${fv(data.customerName)}, (hereinafter "Customer"). This contract between Owner and ${fv(data.customerName)}, is binding and obligatory between and with respect to the following: the service contract, any and all documents referenced herein and attached hereto, including but not limited to, the scope of the work contained in the estimate, rate schedule, payment schedule, any addenda, and any field changes/change orders.
        </div>

        <div class="info-grid">
            <div class="info-row"><span class="info-label">Customer's Name:</span> ${fv(data.customerName)}</div>
            <div class="info-row"><span class="info-label">Phone Number:</span> ${fv(data.phoneNumber)}</div>
            <div class="info-row"><span class="info-label">Customer's Address:</span> ${fv(data.customerAddress)}</div>
            <div class="info-row"><span class="info-label">E-Mail Address:</span> ${fv(data.emailAddress)}</div>
            <div class="info-row"><span class="info-label">Location of Services:</span> ${fv(data.locationOfServices)}</div>
            <div class="info-row"><span class="info-label">Estimated Timeframe:</span> ${fv(data.estimatedTimeframe)}</div>
        </div>

        ${renderLegalSections()}
        ${renderRateScheduleTable(data.rates)}
    `;
}

/**
 * Render all legal sections in order
 */
function renderLegalSections() {
    const sections = [
        LEGAL_SECTIONS.scopeTerms,
        LEGAL_SECTIONS.lien,
        LEGAL_SECTIONS.deliveryOfProperty,
        LEGAL_SECTIONS.permits,
        LEGAL_SECTIONS.propertyLines,
        LEGAL_SECTIONS.inherentHazards,
        LEGAL_SECTIONS.unusualExpenses,
        LEGAL_SECTIONS.performanceOfWork,
        LEGAL_SECTIONS.tarps,
        LEGAL_SECTIONS.noLiability,
        LEGAL_SECTIONS.actOfGod,
        LEGAL_SECTIONS.indemnification,
        LEGAL_SECTIONS.limitationOfRecovery,
        LEGAL_SECTIONS.electronicComms,
        LEGAL_SECTIONS.severability,
        LEGAL_SECTIONS.authority
    ];

    return sections.map(s => `<div class="contract-section">${s}</div>`).join('\n');
}

/**
 * Render the rate schedule as a table
 */
function renderRateScheduleTable(rates) {
    if (!rates || rates.length === 0) return '';

    const selectedRates = rates.filter(r => r.selected);
    if (selectedRates.length === 0) return '<p><em>No equipment or services selected.</em></p>';

    let total = 0;
    const rows = selectedRates.map(r => {
        const price = parseFloat(r.price) || 0;
        total += price;
        const qtyText = r.qty ? ` (${r.qty} people)` : '';
        return `<tr>
            <td>${r.id}.</td>
            <td>${escapeHtml(r.name)}${qtyText}</td>
            <td style="text-align:right">$${price.toFixed(2)}</td>
        </tr>`;
    }).join('');

    return `
        <div class="page-break"><span class="page-label">RATE SCHEDULE</span></div>
        <p style="margin-bottom:8px;font-weight:600;">All rates are an eight (8) hour minimum as is customary in the industry. Normal working hours are 9:00 AM to 5:00 PM.</p>
        <table class="rate-table">
            <thead>
                <tr>
                    <th style="width:40px">#</th>
                    <th>Item / Service</th>
                    <th style="text-align:right;width:120px">Price</th>
                </tr>
            </thead>
            <tbody>
                ${rows}
                <tr class="total-row">
                    <td></td>
                    <td>Total</td>
                    <td style="text-align:right">$${total.toFixed(2)}</td>
                </tr>
            </tbody>
        </table>
    `;
}

/**
 * Escape HTML to prevent XSS
 */
function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

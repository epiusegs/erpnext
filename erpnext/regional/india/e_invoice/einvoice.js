erpnext.setup_einvoice_actions = (doctype) => {
	frappe.ui.form.on(doctype, {
		refresh(frm) {
			const einvoicing_enabled = frappe.db.get_value("E Invoice Settings", "E Invoice Settings", "enable");
			const supply_type = frm.doc.gst_category;
			const valid_supply_type = ['Registered Regular', 'SEZ', 'Overseas', 'Deemed Export'].includes(supply_type)

			if (!einvoicing_enabled || !valid_supply_type) return;

			const { docstatus, irn, irn_cancelled, doctype, name, __unsaved } = frm.doc;

			if (docstatus == 0 && !irn && !__unsaved) {
				frm.add_custom_button(
					"Download E-Invoice",
					() => {
						frappe.call({
							method: 'erpnext.regional.india.e_invoice.e_invoice_utils.make_einvoice',
							args: { doctype, name },
							freeze: true,
							callback: (res) => {
								if (!res.exc) {
									const args = {
										cmd: 'erpnext.regional.india.e_invoice.e_invoice_utils.download_einvoice',
										einvoice: JSON.stringify([res.message]),
										name: name
									};
									open_url_post(frappe.request.url, args);
								}
							}
						})
				}, "E-Invoicing");
				frm.add_custom_button(
					"Upload Signed E-Invoice",
					() => {
						new frappe.ui.FileUploader({
							method: 'erpnext.regional.india.e_invoice.e_invoice_utils.upload_einvoice',
							allow_multiple: 0,
							doctype: doctype,
							docname: name,
							on_success: (attachment, r) => {
								if (!r.exc) {
									frm.reload_doc();
								}
							}
						});
				}, "E-Invoicing");
			}
			if (docstatus == 1 && irn && !irn_cancelled) {
				frm.add_custom_button(
					"Cancel IRN",
					() => {
						const d = new frappe.ui.Dialog({
							title: __('Cancel IRN'),
							fields: [
								{
									"label" : "Reason", "fieldname": "reason",
									"fieldtype": "Select", "reqd": 1, "default": "1-Duplicate",
									"options": ["1-Duplicate", "2-Data Entry Error", "3-Order Cancelled", "4-Other"]
								},
								{
									"label": "Remark", "fieldname": "remark", "fieldtype": "Data", "reqd": 1
								}
							],
							primary_action: function() {
								const data = d.get_values();
								const args = {
									cmd: 'erpnext.regional.india.e_invoice.e_invoice_utils.download_cancel_einvoice',
									irn: irn, reason: data.reason.split('-')[0], remark: data.remark, name: name
								};
								open_url_post(frappe.request.url, args);
								d.hide();
							},
							primary_action_label: __('Download JSON')
						});
						d.show();
				}, "E-Invoicing");
				
				frm.add_custom_button(
					"Upload Cancel JSON",
					() => {
						new frappe.ui.FileUploader({
							method: 'erpnext.regional.india.e_invoice.e_invoice_utils.upload_cancel_ack',
							allow_multiple: 0,
							doctype: doctype,
							docname: name,
							on_success: (attachment, r) => {
								if (!r.exc) {
									frm.reload_doc();
								}
							}
						});
				}, "E-Invoicing");
			}
		}
	})
}
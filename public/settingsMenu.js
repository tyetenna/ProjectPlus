import { packageState } from './packages.js';
import { enabledPackageNames } from './config.js';
import { primaryLoc } from './data.js';

const allPackages = Object.keys(packageState.packageTitles);
// Retrieve enabled packages from localStorage, or use config default if none
const storedEnabled = localStorage.getItem('enabledPackages');
const defaultEnabled = storedEnabled ? storedEnabled.split(',') : enabledPackageNames;

function showSettingsMenu() {
	let overlay = document.getElementById('settings-overlay');
	if (!overlay) {
		overlay = document.createElement('div');
		overlay.id = 'settings-overlay';
		overlay.style.position = 'fixed';
		overlay.style.top = '0';
		overlay.style.left = '0';
		overlay.style.width = '100%';
		overlay.style.height = '100%';
		overlay.style.backgroundColor = 'rgba(0,0,0,0.8)';
		overlay.style.color = '#fff';
		overlay.style.zIndex = '10000';
		overlay.style.display = 'flex';
		overlay.style.flexDirection = 'column';
		overlay.style.alignItems = 'center';
		overlay.style.justifyContent = 'center';
		
		const form = document.createElement('form');
		// Add header text above the checkboxes
		const header = document.createElement('div');
		header.textContent = "Project Plus";
		header.style.fontSize = "40px";
		header.style.fontWeight = "bold";
		header.style.textAlign = "center";
		header.style.width = "100%";
		header.style.marginBottom = "10px";
		form.appendChild(header);

		const credit = document.createElement('div');
		credit.innerHTML = 'by <a href="https://github.com/tyetenna/ProjectPlus" target="_blank" style="color: #7bc6ed; text-decoration: none; font-weight:bold"> Team Dew Point</a>';
		credit.style.fontSize = "24px";
		credit.style.fontWeight = "lighter";
		credit.style.fontStyle = "italic";
		credit.style.textAlign = "center";
		credit.style.width = "100%";
		credit.style.marginBottom = "10px";
		form.appendChild(credit);
		
		// Add horizontal line (solid) across the width
		const hr = document.createElement('hr');
		hr.style.width = "100%";
		hr.style.border = "1px solid #fff";
		hr.style.marginBottom = "10px";
		form.appendChild(hr);
		
		// Add Package title
		const packageTitle = document.createElement('div');
		packageTitle.textContent = "Packages";
		packageTitle.style.textAlight = "center";
		packageTitle.style.fontSize = "18px";
		packageTitle.style.marginBottom = "10px";
		packageTitle.style.marginTop = "10px";
		form.appendChild(packageTitle);
		allPackages.forEach(pkg => {
			const label = document.createElement('label');
			label.style.margin = '5px';
			const checkbox = document.createElement('input');
			checkbox.type = 'checkbox';
			checkbox.value = pkg;
			checkbox.checked = defaultEnabled.includes(pkg);
			// Disable checkbox if package is marked as disabled in packageState
			if (packageState.disabledPackages.includes(pkg)) {
				checkbox.disabled = true;
			}

			// Use property values for display (with special overrides)
			let displayText = '';
			if (pkg === "Core") {
				displayText = "Your Local Forecast (Core)";
			} else if (pkg === "MiniCore") {
				displayText = "Your Local Forecast (Mini-Core)";
			} else if (pkg === "ExtraLocal") {
				displayText = primaryLoc && primaryLoc.city
					? `Forecast for ${primaryLoc.city} (Extra Local)`
					: "Forecast for Unknown (Extra Local)";
			} else if (pkg === "Winter"){
				displayText = "Outdoor Activity (Winter)";
			} else {
				displayText = packageState.packageTitles[pkg];
			}

			label.appendChild(checkbox);
			label.appendChild(document.createTextNode(' ' + displayText));
			form.appendChild(label);
			form.appendChild(document.createElement('br'));
		});
		
		const confirmBtn = document.createElement('button');
		confirmBtn.type = 'button';
		confirmBtn.textContent = 'Confirm & Reload';
		confirmBtn.style.marginTop = '20px';
		confirmBtn.addEventListener('click', () => {
			const enabled = Array.from(form.querySelectorAll('input[type="checkbox"]'))
				.filter(chk => chk.checked)
				.map(chk => chk.value);
			localStorage.setItem('enabledPackages', enabled.join(','));
			location.reload();
		});
		form.appendChild(confirmBtn);
		overlay.appendChild(form);
		document.body.appendChild(overlay);
	} else {
		overlay.style.display = 'flex';
	}
}

export { showSettingsMenu };

export function shuffle(array, random = Math.random) {
  return array
  .map(value => ({ value, sort: random() }))
  .sort((a, b) => a.sort - b.sort)
  .map(({ value }) => value);
}

export function setStorage(name, value) {
	let val = JSON.stringify(value);
	localStorage.setItem(name, val);
}

export function getStorage(name) {
	if (localStorage.getItem(name)) {
		return JSON.parse(localStorage.getItem(name));
	}
	return null;
}

export function deleteStorage(name) {
	localStorage.removeItem(name);
}
export function scrapeProfileData() {
  const getText = (selector) => {
    const el = document.querySelector(selector);
    return el?.textContent?.trim() ?? "";
  };
  return {
    name: getText("h1"),
    headline: getText(".text-body-medium.break-words"),
    location: getText(".text-body-small.inline.t-black--light.break-words"),
    about: getText("#about ~ div .inline-show-more-text"),
    connections: getText(".t-bold"),
  };
}

import { shouldShowWelcome } from "../utils/welcome";

describe("accueil du premier lancement", () => {
  it("s'affiche seulement pour une app neuve", () => {
    expect(shouldShowWelcome({ welcomeDone: false, operations: 0 })).toBe(true);
  });

  it("ne s'affiche pas après une mise à jour d'une app déjà utilisée", () => {
    expect(shouldShowWelcome({ welcomeDone: false, operations: 5 })).toBe(false);
  });

  it("ne revient pas une fois vu, même si tout a été supprimé", () => {
    expect(shouldShowWelcome({ welcomeDone: true, operations: 0 })).toBe(false);
  });
});

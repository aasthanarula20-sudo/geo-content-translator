declare module "text-readability" {
  interface ReadabilityStatic {
    fleschKincaidGrade(text: string): number;
    fleschReadingEase(text: string): number;
  }
  const readability: ReadabilityStatic;
  export default readability;
}

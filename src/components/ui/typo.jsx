export default function Typo({
  children,
  variant = "body",
  className = "",
  as,
}) {
  const Component = as || "p";

  const variantClasses = {
    h1: "typo typo-h1",
    h2: "typo typo-h2",
    h3: "typo typo-h3",
    h4: "typo typo-h4",
    "body-lg": "typo typo-body-lg",
    body: "typo typo-body",
    "body-sm": "typo typo-body-sm",
    caption: "typo typo-caption",
  }; 

  return (
    <Component className={`${variantClasses[variant]} ${className}`}>
      {children}
    </Component>
  );
}

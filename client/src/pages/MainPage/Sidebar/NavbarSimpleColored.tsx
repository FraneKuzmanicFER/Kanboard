import { IconPresentationAnalytics, IconUsers } from "@tabler/icons-react";
import classes from "./NavbarSimpleColored.module.css";

const data = [
  { link: "", label: "Projects", icon: IconPresentationAnalytics },
  { link: "", label: "Friends", icon: IconUsers },
];

type NavbarProps = {
  setActivePage: (page: string) => void;
  activePage: string;
};

export function NavbarSimpleColored({
  setActivePage,
  activePage,
}: NavbarProps) {
  const links = data.map((item) => (
    <div
      className={classes.link}
      data-active={item.label === activePage || undefined}
      key={item.label}
      onClick={() => setActivePage(item.label)}
    >
      <item.icon className={classes.linkIcon} stroke={1.5} />
      <span>{item.label}</span>
    </div>
  ));

  return (
    <nav className={classes.navbar}>
      <div className={classes.navbarMain}>{links}</div>
    </nav>
  );
}

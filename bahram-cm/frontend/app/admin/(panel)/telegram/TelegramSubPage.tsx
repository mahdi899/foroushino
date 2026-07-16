import { AdminPage } from '../ui';
import { AdminContentPanel } from '@/components/admin/layout/AdminContentPanel';
import { AdminListEmpty } from '@/components/admin/layout/AdminListEmpty';

type TelegramSubPageProps = {
  title: string;
  description: string;
  icon: string;
  children?: React.ReactNode;
  panelTitle?: string;
  empty?: {
    icon: string;
    title: string;
    description?: string;
    action?: React.ReactNode;
  };
};

export function TelegramSubPage({
  title,
  description,
  icon,
  children,
  panelTitle,
  empty,
}: TelegramSubPageProps) {
  return (
    <AdminPage
      title={title}
      desc={description}
      icon={icon}
      headerVariant="telegram"
      backHref="/admin/telegram"
      backLabel="ربات تلگرام"
    >
      <div className="admin-telegram-subpage">
        {children ? (
          panelTitle ? (
            <AdminContentPanel title={panelTitle}>{children}</AdminContentPanel>
          ) : (
            children
          )
        ) : empty ? (
          <AdminContentPanel title={panelTitle ?? title}>
            <AdminListEmpty
              icon={empty.icon}
              title={empty.title}
              description={empty.description}
              action={empty.action}
              className="admin-telegram-subpage__empty"
            />
          </AdminContentPanel>
        ) : null}
      </div>
    </AdminPage>
  );
}

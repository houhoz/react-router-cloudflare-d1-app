import { useFetcher, data } from 'react-router';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { eq } from 'drizzle-orm';
import * as React from 'react';
import * as schema from '~/database/schema';
import { Button } from '~/components/ui/button';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '~/components/ui/form';
import { Input } from '~/components/ui/input';
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '~/components/ui/table';
import type { Route } from './+types/electricity';
import { toast } from 'sonner';

export function meta({}: Route.MetaArgs) {
  return [
    { title: 'New React Router App' },
    { name: 'description', content: 'Welcome to React Router!' },
  ];
}

const formSchema = z.object({
  date: z.string().min(2, {
    message: '请输入正确的日期',
  }),
  electricity: z.string().min(2, {
    message: '请输入正确的电量',
  }),
});

export async function action({ request, context }: Route.ActionArgs) {
  const formData = await request.formData();
  const date = formData.get('date')?.toString().trim();
  const electricity = formData.get('electricity')?.toString().trim();

  // 查询数据库中是否存在该日期
  const existing = await context.db.query.dailyElectricityTable.findFirst({
    where: eq(schema.dailyElectricityTable.date, date ?? ''),
  });

  console.log('existing', existing);

  if (existing) {
    // toast.error('该日期已存在');
    return data({ message: '该日期已存在' }, { status: 400 });
    // return data({ message: '该日期已存在' }, { status: 400 });
  }

  try {
    await context.db.insert(schema.dailyElectricityTable).values({
      date: date ?? '',
      electricity: Number(electricity),
    });
  } catch (error) {
    return data({ message: '插入失败' }, { status: 400 });
  }
}

export async function loader({ context }: Route.LoaderArgs) {
  const list = await context.db.query.dailyElectricityTable.findMany({
    columns: {
      id: true,
      date: true,
      electricity: true,
      diff: true,
    },
  });

  return {
    list,
  };
}

export default function Home({ actionData, loaderData }: Route.ComponentProps) {
  const fetcher = useFetcher();
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),

    defaultValues: {
      date: '',
      electricity: '',
    },
  });

  // 添加 useEffect 监听 fetcher 状态变化
  React.useEffect(() => {
    if (fetcher.data && fetcher.state === 'idle') {
      if (fetcher.data.success) {
        toast.success(fetcher.data.message);
        form.reset(); // 成功后重置表单
      } else {
        toast.error(fetcher.data.message);
      }
    }
  }, [fetcher.data, fetcher.state, form]);

  const onSubmit = (data: z.infer<typeof formSchema>) => {
    fetcher.submit(data, {
      method: 'post',
    });
  };

  return (
    <div>
      <h1 className="text-2xl font-bold">Electricity</h1>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
          <FormField
            control={form.control}
            name="date"
            render={({ field }) => (
              <FormItem>
                <FormLabel>日期</FormLabel>
                <FormControl>
                  <Input placeholder="请输入正确的日期" {...field} />
                </FormControl>
                <FormDescription>正确的日期格式为：2025-01-01</FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="electricity"
            render={({ field }) => (
              <FormItem>
                <FormLabel>电量</FormLabel>
                <FormControl>
                  <Input placeholder="请输入正确的电量" {...field} />
                </FormControl>
                <FormDescription>正确的电量格式为：100</FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
          <Button type="submit">提交</Button>
        </form>
      </Form>
      <Table>
        <TableCaption>A list of your recent invoices.</TableCaption>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[100px]">ID</TableHead>
            <TableHead>日期</TableHead>
            <TableHead>电量</TableHead>
            <TableHead className="text-right">差值</TableHead>
          </TableRow>
        </TableHeader>
        {loaderData.list.map((item) => (
          <TableBody key={item.id}>
            <TableRow>
              <TableCell className="font-medium">{item.id}</TableCell>
              <TableCell>{item.date}</TableCell>
              <TableCell>{item.electricity}</TableCell>
              <TableCell className="text-right">{item.diff}</TableCell>
            </TableRow>
          </TableBody>
        ))}
      </Table>
    </div>
  );
}

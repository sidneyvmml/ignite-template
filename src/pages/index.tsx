import { GetStaticProps } from 'next';
import Head from 'next/head'
import Link from 'next/link'
import Prismic from '@prismicio/client'
import { format } from 'date-fns';
import ptBR from 'date-fns/locale/pt-BR'
import { FiUser, FiCalendar } from 'react-icons/fi'

import Header from '../components/Header'
import { getPrismicClient } from '../services/prismic';

import commonStyles from '../styles/common.module.scss';
import styles from './home.module.scss';
import { useEffect, useState } from 'react';
import { RichText } from 'prismic-dom';

interface Post {
  uid?: string;
  first_publication_date: string | null;
  data: {
    title: string;
    subtitle: string;
    author: string;
  };
}

interface PostPagination {
  next_page: string;
  results: Post[];
}

interface HomeProps {
  postsPagination: PostPagination;
  preview: boolean;
}

function parseResult(result: any[]): Post[] {
  return result.map(post => ({
    uid: post.uid,
    first_publication_date: post.first_publication_date,
    data: {
      ...post.data,
    },
  }));
}

export default function Home({ postsPagination, preview }: HomeProps) {

  const [posts, setPosts] = useState<Post[]>([] as Post[])
  const [nextPage, setNextPage] = useState<string | null>("")

  useEffect(() => {
    setNextPage(postsPagination?.next_page)
    setPosts(postsPagination?.results)
  }, [postsPagination?.results])

  async function handleLoadMorePosts() {
    if (nextPage) {
      try {
        const response: PostPagination = await (await fetch(nextPage)).json()
        console.log(response.next_page);

        setPosts([...posts, ...response?.results])
        setNextPage(response.next_page)
        return

      } catch (error) {
        alert(error)
      }
    }
    alert('Erro ao fazer a requisição!')
  }
  return (
    <>
      <Head>
        <title>Home | SpaceTraveling 42</title>
      </Head>
      <main className={commonStyles.container}>
        <Header />
        <div className={styles.container}>
          {posts.map(({ data, first_publication_date, uid }) => (
            <article key={uid} className={styles.post}>
              <Link href={`/post/${uid}`}>
                <a>
                  <h1>{data.title}</h1>
                  <p>{data.subtitle}</p>
                  <div className={styles.postInfos}>
                    <div className={styles.updatedAt}>
                      <FiCalendar className={styles.icon} />
                      <time>{format(
                        new Date(first_publication_date),
                        "dd LLL yyyy",
                        {
                          locale: ptBR,

                        }
                      )}</time>
                    </div>
                    <div className={styles.author}>
                      <FiUser className={styles.icon} />
                      <p>{data.author}</p>
                    </div>
                  </div>
                </a>
              </Link>
            </article>
          ))}
          {!!nextPage && (
            <a onClick={handleLoadMorePosts} className={styles.buttonMorePosts}>
              Carregar mais posts
            </a>
          )}
        </div>
        {preview && (
          <aside className={commonStyles.preview}>
            <Link href="/api/exit-preview">
              <a>Sair do modo Preview</a>
            </Link>
          </aside>
        )}
      </main>
    </>

  )
}

export const getStaticProps: GetStaticProps = async () => {
  const prismic = getPrismicClient();
  const postsResponse = await prismic.query(
    Prismic.Predicates.at('document.type', 'posts'),
    {
      fetch: ['posts.title', 'posts.subtitle', 'posts.author'],
      pageSize: 1,
    }
  );

  const posts: Post[] = parseResult(postsResponse.results);

  return {
    revalidate: 60 * 60, // 1 hora
    props: {
      postsPagination: {
        results: posts,
        next_page: postsResponse.next_page,
      },
    },
  };
};